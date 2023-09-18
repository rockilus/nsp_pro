#!/usr/bin/env python3
import itertools
from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore


class BuildModel:
    def __init__(self, var_params: Dict, constraints: List) -> None:
        self.model = cp_model.CpModel()
        self.work: Dict[Tuple, Dict] = {}
        self.var_params = var_params
        self.constraints = constraints
        self.var_string = "work"
        self.obj_int_vars: List[cp_model.IntVar] = []
        self.obj_int_coeffs: List[int] = []
        self.obj_bool_vars: List[cp_model.IntVar] = []
        self.obj_bool_coeffs: List[int] = []

    def build_variables(self) -> None:
        sorted_var_params = dict(
            sorted(self.var_params.items(), key=lambda item: item[1]["index"])
        )
        coordinates = list(
            itertools.product(
                *[range(sorted_var_params[k]["value"]) for k in sorted_var_params]
            )
        )
        for coordinate in coordinates:
            self.work[coordinate] = self.model.NewBoolVar(
                f"{self.var_string}{'_'.join(str(c) for c in coordinate)}"
            )
        # print("done")

    def build_constraints(self) -> None:
        for constraint in self.constraints:
            self.add_constraints(constraint)

    def add_constraints(self, constraint: Dict) -> None:
        constraints_variables = self.get_constraints_variables(constraint)
        self.add_constraints_to_model(constraint, constraints_variables)
        # print("done")

    def get_constraints_variables(self, constraint: Dict) -> List[List]:
        coordinates_order = []
        (
            inter_params_dict,
            new_coordinates_order,
        ) = self.build_constraints_coordinates(constraint["inter_params"])
        coordinates_order += new_coordinates_order
        (
            intra_params_dict,
            new_coordinates_order,
        ) = self.build_constraints_coordinates(constraint["intra_params"])
        coordinates_order += new_coordinates_order

        # pylint: disable=consider-using-dict-items
        inter_coordinates = list(
            itertools.product(*[inter_params_dict[k] for k in inter_params_dict])
        )
        # pylint: disable=consider-using-dict-items
        intra_coordinates = list(
            itertools.product(*[intra_params_dict[k] for k in intra_params_dict])
        )

        constraints_variables = []
        for inter_coordinate in inter_coordinates:
            constraint_variables = []
            for intra_coordinate in intra_coordinates:
                coordinates_random = tuple(
                    itertools.chain(inter_coordinate, intra_coordinate)
                )
                coordinates_ordered = tuple(
                    coordinates_random[i] for i in coordinates_order
                )
                coordinate_expanded = BuildModel.expand_coordinates(
                    coordinates_ordered, constraint["constraint_type"]
                )
                constraint_variables += [self.work[ce] for ce in coordinate_expanded]
            constraints_variables.append(constraint_variables)
        # print("checkpoint")

        return constraints_variables

    @staticmethod
    def expand_coordinates(
        coordinates_ordered: Tuple, constraint_type: str
    ) -> List[Tuple]:
        expanded_coordinates = [coordinates_ordered]
        if constraint_type == "causality":
            list_indices = [
                i
                for i, coord in enumerate(coordinates_ordered)
                if isinstance(coord, list)
            ]
            if len(list_indices) != 0:
                expanded_coordinates = []
                length_list = len(coordinates_ordered[list_indices[0]])
                for j in range(length_list):
                    new_coordinates = []
                    for i, coord in enumerate(coordinates_ordered):
                        if i in list_indices:
                            new_coordinates.append(coord[j])
                        else:
                            new_coordinates.append(coord)
                    expanded_coordinates.append(tuple(new_coordinates))
        else:
            for i, coord in enumerate(coordinates_ordered):
                if isinstance(coord, list):
                    new_coordinates = []
                    for c in coord:
                        for ec in expanded_coordinates:
                            new_coordinates.append(ec[:i] + (c,) + ec[i + 1 :])
                    expanded_coordinates = new_coordinates
        return expanded_coordinates

    def build_constraints_coordinates(
        self, params: Dict
    ) -> Tuple[Dict[str, List], List]:
        params_dict = {}
        coordinates_order = []
        for label, options in params.items():
            operator = options["operator"]
            coordinates_order.append(self.var_params[label]["index"])
            # pylint: disable=too-many-branches
            if operator == "all":
                params_dict[label] = list(range(self.var_params[label]["value"]))
            elif operator == "equal":
                params_dict[label] = [options["value"]]
            elif operator == "modulo":
                params_dict[label] = list(
                    range(
                        options["value"],
                        self.var_params[label]["value"],
                        options["interval"],
                    )
                )
            elif operator == "interval":
                params_dict[label] = [
                    list(range(i, i + options["interval"]))  # type: ignore
                    for i in range(
                        options["value"],
                        self.var_params[label]["value"],
                        options["interval"],
                    )
                ]
            elif operator == "pair":
                params_dict[label] = [
                    [options["value"], options["other_value"]]  # type: ignore
                ]
            elif operator == "offset":
                params_dict[label] = [
                    [i, i + options["interval"]]  # type: ignore
                    for i in range(
                        0,
                        self.var_params[label]["value"] - options["interval"],
                    )
                ]
            else:
                raise ValueError("operator not recognized for target_params")
        return params_dict, coordinates_order

    # pylint: disable=too-many-branches
    def add_constraints_to_model(
        self,
        constraint: Dict,
        constraints_variables: List[List],
    ) -> None:
        constraint_type = constraint["constraint_type"]
        if constraint_type == "add_exactly_one":
            for constraint_variables in constraints_variables:
                self.model.AddExactlyOne(constraint_variables)
        elif constraint_type == "add":
            for constraint_variables in constraints_variables:
                self.model.Add(sum(constraint_variables) == constraint["target_value"])
        elif constraint_type == "min_max_sum":
            for constraint_variables in constraints_variables:
                (
                    target_params_label,
                    target_params_value,
                ) = BuildModel.get_target_params_label_value(constraint)
                self.add_soft_sum_constraint(
                    constraint_variables,
                    constraint["hard_min"],
                    constraint["soft_min"],
                    constraint["soft_min_penalty"],
                    constraint["soft_max"],
                    constraint["hard_max"],
                    constraint["soft_max_penalty"],
                    target_params_label,
                    target_params_value,
                )
        elif constraint_type == "min_max_sequence":
            for constraint_variables in constraints_variables:
                (
                    target_params_label,
                    target_params_value,
                ) = BuildModel.get_target_params_label_value(constraint)
                self.add_soft_sequence_constraint(
                    constraint_variables,
                    constraint["hard_min"],
                    constraint["soft_min"],
                    constraint["soft_min_penalty"],
                    constraint["soft_max"],
                    constraint["hard_max"],
                    constraint["soft_max_penalty"],
                    target_params_label,
                    target_params_value,
                )
        elif constraint_type == "causality":
            for constraint_variables in constraints_variables:
                self.add_causality_constraint(
                    constraint_variables,
                    constraint["hard_constraint"],
                    constraint["penalty"],
                )
        elif constraint_type == "request":
            for constraint_variables in constraints_variables:
                self.add_request_objetive(
                    constraint_variables,
                    constraint["penalty"],
                )
        else:
            raise ValueError("constraint_type not in model")

    @staticmethod
    def get_target_params_label_value(constraint: Dict) -> Tuple[List, List]:
        # pylint: disable=too-many-branches
        if constraint["constraint_type"] in [
            "min_max_sum",
            "min_max_sequence",
        ]:
            target_params_label = [
                key
                for key, value in constraint["inter_params"].items()
                if value["operator"] == "equal"
            ]
            target_params_value = [
                constraint["inter_params"][key]["value"] for key in target_params_label
            ]
        else:
            raise ValueError("constraint_type not in compatible")
        return target_params_label, target_params_value

    # pylint: disable=too-many-arguments, too-many-locals
    def add_soft_sum_constraint(
        self,
        works: List[cp_model.IntVar],
        hard_min: int,
        soft_min: int,
        min_cost: int,
        soft_max: int,
        hard_max: int,
        max_cost: int,
        target_params_label: List[str],
        target_params_value: List[int],
    ) -> None:
        cost_variables = []
        cost_coefficients = []
        works_tuples = [
            key
            for key, value in self.work.items()
            for work_search in works
            if value == work_search
        ]
        min_values = [min(column) for column in zip(*works_tuples)]
        max_values = [max(column) for column in zip(*works_tuples)]
        # pylint: disable=line-too-long
        prefix = f"sum_constraint{'_'.join(f'{str(mini)}:{str(maxi)}' for mini, maxi in zip(min_values, max_values))}"  # noqa: E501
        target_params = f"{'/'.join(f'{label}_{str(value)}' for label, value in zip(target_params_label, target_params_value))}"  # noqa: E501

        sum_var = self.model.NewIntVar(hard_min, hard_max, "")
        # This adds the hard constraints on the sum.
        self.model.Add(sum_var == sum(works))

        # Penalize sums below the soft_min target.
        if soft_min > hard_min and min_cost > 0:
            delta = self.model.NewIntVar(-len(works), len(works), "")
            self.model.Add(delta == soft_min - sum_var)
            # TODO(user): Compare efficiency with only excess >= soft_min - sum_var.
            excess = self.model.NewIntVar(
                0,
                7,
                prefix + f" -> {target_params} under_sum of {soft_min}",
            )
            self.model.AddMaxEquality(excess, [delta, 0])
            cost_variables.append(excess)
            cost_coefficients.append(min_cost)

        # Penalize sums above the soft_max target.
        if soft_max < hard_max and max_cost > 0:
            delta = self.model.NewIntVar(-7, 7, "")
            self.model.Add(delta == sum_var - soft_max)
            excess = self.model.NewIntVar(
                0, 7, prefix + f"-> {target_params} over_sum of {soft_max}"
            )
            self.model.AddMaxEquality(excess, [delta, 0])
            cost_variables.append(excess)
            cost_coefficients.append(max_cost)

        self.obj_int_vars.extend(cost_variables)
        self.obj_int_coeffs.extend(cost_coefficients)

    # pylint: disable=too-many-arguments, too-many-locals
    def add_soft_sequence_constraint(
        self,
        works: List[cp_model.IntVar],
        hard_min: int,
        soft_min: int,
        min_cost: int,
        soft_max: int,
        hard_max: int,
        max_cost: int,
        target_params_label: List[str],
        target_params_value: List[int],
    ) -> None:
        cost_literals = []
        cost_coefficients = []
        works_tuples = [
            key
            for key, value in self.work.items()
            for work_search in works
            if value == work_search
        ]
        min_values = [min(column) for column in zip(*works_tuples)]
        max_values = [max(column) for column in zip(*works_tuples)]
        # pylint: disable=line-too-long
        prefix = f"sequence_constraint{'_'.join(f'{str(mini)}:{str(maxi)}' for mini, maxi in zip(min_values, max_values))}"  # noqa: E501
        target_params = f"{'/'.join(f'{label}_{str(value)}' for label, value in zip(target_params_label, target_params_value))}"  # noqa: E501

        # Forbid sequences that are too short.
        for length in range(1, hard_min):
            for start in range(len(works) - length + 1):
                self.model.AddBoolOr(
                    BuildModel.negated_bounded_span(works, start, length)
                )

        # Penalize sequences that are below the soft limit.
        if min_cost > 0:
            for length in range(hard_min, soft_min):
                for start in range(len(works) - length + 1):
                    span = BuildModel.negated_bounded_span(works, start, length)
                    # pylint: disable=line-too-long
                    name = f"-> {target_params} under_span(start={start}, length={length}) of soft_min={soft_min}"  # noqa: E501
                    lit = self.model.NewBoolVar(prefix + name)
                    span.append(lit)
                    self.model.AddBoolOr(span)
                    cost_literals.append(lit)
                    # We filter exactly the sequence with a short length.
                    # The penalty is proportional to the delta with soft_min.
                    cost_coefficients.append(min_cost * (soft_min - length))

        # Penalize sequences that are above the soft limit.
        if max_cost > 0:
            for length in range(soft_max + 1, hard_max + 1):
                for start in range(len(works) - length + 1):
                    span = BuildModel.negated_bounded_span(works, start, length)
                    # pylint: disable=line-too-long
                    name = f"-> {target_params} over_span(start={start}, length={length}) of soft_max={soft_max}"  # noqa: E501
                    lit = self.model.NewBoolVar(prefix + name)
                    span.append(lit)
                    self.model.AddBoolOr(span)
                    cost_literals.append(lit)
                    # Cost paid is max_cost * excess length.
                    cost_coefficients.append(max_cost * (length - soft_max))

        # Just forbid any sequence of true variables with length hard_max + 1
        for start in range(len(works) - hard_max):
            self.model.AddBoolOr(
                [works[i].Not() for i in range(start, start + hard_max + 1)]
            )

        self.obj_bool_vars.extend(cost_literals)
        self.obj_bool_coeffs.extend(cost_coefficients)

    @staticmethod
    def negated_bounded_span(
        works: List[cp_model.IntVar], start: int, length: int
    ) -> List[cp_model.IntVar]:
        sequence = []
        # Left border (start of works, or works[start - 1])
        if start > 0:
            sequence.append(works[start - 1])
        for i in range(length):
            sequence.append(works[start + i].Not())
        # Right border (end of works or works[start + length])
        if start + length < len(works):
            sequence.append(works[start + length])
        return sequence

    def add_causality_constraint(
        self, works: List[cp_model.IntVar], hard_constraint: bool, cost: int
    ) -> None:
        works_tuples = [
            key
            for key, value in self.work.items()
            for work_search in works
            if value == work_search
        ]
        transition = [work.Not() for work in works]
        if hard_constraint:
            self.model.AddBoolOr(transition)
        else:
            trans_var = self.model.NewBoolVar(
                f"transition ({' '.join(str(works_tuples))})"
            )
            transition.append(trans_var)
            self.model.AddBoolOr(transition)
            self.obj_bool_vars.append(trans_var)
            self.obj_bool_coeffs.append(cost)

    def add_request_objetive(self, works: List[cp_model.IntVar], cost: int) -> None:
        for work in works:
            self.obj_bool_vars.append(work)
            self.obj_bool_coeffs.append(cost)

    def add_objective(self) -> None:
        self.model.Minimize(
            sum(
                self.obj_bool_vars[i] * self.obj_bool_coeffs[i]
                for i in range(len(self.obj_bool_vars))
            )
            + sum(
                self.obj_int_vars[i] * self.obj_int_coeffs[i]
                for i in range(len(self.obj_int_vars))
            )
        )
