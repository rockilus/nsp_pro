#!/usr/bin/env python3
import itertools
from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore


class BuildModel:
    def __init__(
        self,
        var_params: List[Dict],
        constraints: List,
        constraints_variables: List,
    ) -> None:
        self.model = cp_model.CpModel()
        self.work: Dict[Tuple, Dict] = {}
        self.var_params = var_params
        self.constraints = constraints
        self.constraints_variables = constraints_variables
        self.var_string = "work"
        self.obj_int_vars: List[cp_model.IntVar] = []
        self.obj_int_coeffs: List[int] = []
        self.obj_bool_vars: List[cp_model.IntVar] = []
        self.obj_bool_coeffs: List[int] = []

    def build_variables(self) -> None:
        sorted_var_params = sorted(self.var_params, key=lambda x: x["index"])

        coordinates = list(
            itertools.product(
                *[
                    range(len(var_param["value_options"]))
                    for var_param in sorted_var_params
                ]
            )
        )
        for coordinate in coordinates:
            self.work[coordinate] = self.model.NewBoolVar(
                f"{self.var_string}{'_'.join(str(c) for c in coordinate)}"
            )
        # print("done")

    def build_constraints(self) -> None:
        for constraint, constraint_variables in zip(
            self.constraints, self.constraints_variables
        ):
            constraints_works = self.build_constraints_works_list(
                constraint, constraint_variables
            )
            self.add_constraints_to_model(
                constraint, constraint_variables, constraints_works
            )

    def build_constraints_works_list(
        self, constraint: Dict, constraint_variables: List[Dict]
    ) -> List[List]:
        (
            inter_var_list,
            intra_var_list,
            var_order,
        ) = self.build_constraint_variables_lists(constraint_variables)

        inter_coordinates = list(itertools.product(*inter_var_list))
        intra_coordinates = list(itertools.product(*intra_var_list))

        constraints_works = []
        for inter_coordinate in inter_coordinates:
            works = []
            for intra_coordinate in intra_coordinates:
                coordinates_random = tuple(
                    itertools.chain(inter_coordinate, intra_coordinate)
                )
                coordinates_ordered = tuple(coordinates_random[i] for i in var_order)
                coordinate_expanded = BuildModel.expand_coordinates(
                    coordinates_ordered, constraint["constraint_type"]
                )
                works += [self.work[ce] for ce in coordinate_expanded]
            constraints_works.append(works)
        return constraints_works

    def build_constraint_variables_lists(
        self, constraint_variables: List[Dict]
    ) -> Tuple[List, List, List]:
        inter_var_list = []
        intra_var_list = []
        var_order_inter = []
        var_order_intra = []
        for constraint_variable in constraint_variables:
            var_param: Dict = next(
                (
                    var_param
                    for var_param in self.var_params
                    if var_param["name"] == constraint_variable["param"]
                ),
                {},
            )
            var_list = BuildModel.build_var_list(
                constraint_variable, len(var_param["value_options"])
            )
            if constraint_variable["intra"]:
                var_order_intra.append(var_param["index"])
                intra_var_list.append(var_list)
            else:
                var_order_inter.append(var_param["index"])
                inter_var_list.append(var_list)

        var_order = var_order_inter + var_order_intra
        return inter_var_list, intra_var_list, var_order

    @staticmethod
    def build_var_list(constraint_variable: Dict, sample_size: int) -> List:
        operator = constraint_variable["operator"]
        if operator == "all":
            return list(range(sample_size))
        if operator == "equal":
            return [constraint_variable["value"]]
        if operator == "modulo":
            return list(
                range(
                    constraint_variable["value"],
                    sample_size,
                    constraint_variable["interval"],
                )
            )
        if operator == "interval":
            return [
                list(range(i, i + constraint_variable["interval"]))
                for i in range(
                    constraint_variable["value"],
                    sample_size,
                    constraint_variable["interval"],
                )
            ]
        if operator == "pair":
            return [
                [
                    constraint_variable["value"],
                    constraint_variable["other_value"],
                ]
            ]
        if operator == "offset":
            return [
                [i, i + constraint_variable["interval"]]
                for i in range(
                    0,
                    sample_size - constraint_variable["interval"],
                )
            ]
        raise ValueError("operator not recognized for target_params")

    @staticmethod
    def expand_coordinates(
        coordinates_ordered: Tuple, constraint_type: str
    ) -> List[Tuple]:
        expanded_coordinates = [coordinates_ordered]
        if constraint_type == "order":
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

    def add_constraints_to_model(
        self,
        constraint: Dict,
        constraint_variables: List[Dict],
        constraints_works: List[List],
    ) -> None:
        constraint_type = constraint["constraint_type"]
        if constraint_type == "add":
            for constraint_works in constraints_works:
                self.model.Add(sum(constraint_works) == constraint["target_value"])
        elif constraint_type == "sum":
            self.add_sum_constraint(constraint, constraint_variables, constraints_works)
        elif constraint_type == "sequence":
            self.add_sequence_constraint(
                constraint, constraint_variables, constraints_works
            )
        elif constraint_type == "order":
            for constraint_works in constraints_works:
                self.add_order_constraint(constraint_works, constraint)
        elif constraint_type == "request":
            for constraint_works in constraints_works:
                self.add_request_objetive(
                    constraint_works,
                    constraint["penalty"],
                )
        else:
            raise ValueError("constraint_type not in model")

    def add_sum_constraint(
        self,
        constraint: Dict,
        constraint_variables: List,
        constraints_works: List,
    ) -> None:
        if constraint["hard_constraint"]:
            for constraint_works in constraints_works:
                self.add_hard_sum_constraint(constraint_works, constraint)
        else:
            for constraint_works in constraints_works:
                (
                    target_params_label,
                    target_params_value,
                ) = BuildModel.get_target_params_label_value(
                    constraint, constraint_variables
                )
                self.add_soft_sum_constraint(
                    constraint_works,
                    constraint,
                    target_params_label,
                    target_params_value,
                )

    def add_sequence_constraint(
        self,
        constraint: Dict,
        constraint_variables: List,
        constraints_works: List,
    ) -> None:
        if constraint["hard_constraint"]:
            for constraint_works in constraints_works:
                self.add_hard_sequence_constraint(constraint_works, constraint)
        else:
            for constraint_works in constraints_works:
                (
                    target_params_label,
                    target_params_value,
                ) = BuildModel.get_target_params_label_value(
                    constraint, constraint_variables
                )
                self.add_soft_sequence_constraint(
                    constraint_works,
                    constraint,
                    target_params_label,
                    target_params_value,
                )

    @staticmethod
    def get_target_params_label_value(
        constraint: Dict, constraint_variables: List[Dict]
    ) -> Tuple[List, List]:
        # pylint: disable=too-many-branches
        if constraint["constraint_type"] in [
            "sum",
            "sequence",
        ]:
            target_vars: List[Dict] = [
                var for var in constraint_variables if var["operator"] == "equal"
            ]
            target_vars_label = [var["param"] for var in target_vars]
            target_vars_value = [var["value"] for var in target_vars]
        else:
            raise ValueError("constraint_type not in compatible")
        return target_vars_label, target_vars_value

    def add_hard_sum_constraint(
        self,
        works: List[cp_model.IntVar],
        constraint: Dict,
    ) -> None:
        target_value = constraint["target_value"]
        if constraint["operator"] == "equal":
            sum_var = self.model.NewIntVar(target_value, target_value, "")
        elif constraint["operator"] == "at_least":
            sum_var = self.model.NewIntVar(target_value, len(works), "")
        elif constraint["operator"] == "at_most":
            sum_var = self.model.NewIntVar(0, target_value, "")
        self.model.Add(sum_var == sum(works))

    def add_soft_sum_constraint(
        self,
        works: List[cp_model.IntVar],
        constraint: Dict,
        target_params_label: List[str],
        target_params_value: List[int],
    ) -> None:
        works_tuples = [
            key
            for key, value in self.work.items()
            for work_search in works
            if value == work_search
        ]
        min_values = [min(column) for column in zip(*works_tuples)]
        max_values = [max(column) for column in zip(*works_tuples)]
        prefix = "sum_constraint" + "_".join(
            f"{str(mini)}:{str(maxi)}" for mini, maxi in zip(min_values, max_values)
        )
        target_params = "/".join(
            f"{label}_{str(value)}"
            for label, value in zip(target_params_label, target_params_value)
        )

        target_value = constraint["target_value"]
        penalty = constraint["penalty"]
        if penalty != 0:
            if (
                constraint["operator"] == "at_least"
                or constraint["operator"] == "equal"
            ):
                delta = self.model.NewIntVar(-len(works), len(works), "")
                self.model.Add(delta == target_value - sum(works))
                excess = self.model.NewIntVar(
                    0,
                    len(works),
                    prefix + f" -> {target_params} under_sum of {target_value}",
                )
                self.model.AddMaxEquality(excess, [delta, 0])
                self.obj_int_vars.append(excess)
                self.obj_int_coeffs.append(penalty)
            if constraint["operator"] == "at_most" or constraint["operator"] == "equal":
                delta = self.model.NewIntVar(-len(works), len(works), "")
                self.model.Add(delta == sum(works) - target_value)
                excess = self.model.NewIntVar(
                    0,
                    len(works),
                    prefix + f"-> {target_params} over_sum of {target_value}",
                )
                self.model.AddMaxEquality(excess, [delta, 0])
                self.obj_int_vars.append(excess)
                self.obj_int_coeffs.append(penalty)

    def add_hard_sequence_constraint(
        self,
        works: List[cp_model.IntVar],
        constraint: Dict,
    ) -> None:
        target_value = constraint["target_value"]
        if constraint["operator"] == "at_least" or constraint["operator"] == "equal":
            for length in range(1, target_value):
                for start in range(len(works) - length + 1):
                    self.model.AddBoolOr(
                        BuildModel.negated_bounded_span(works, start, length)
                    )
        if constraint["operator"] == "at_most" or constraint["operator"] == "equal":
            for start in range(len(works) - target_value):
                self.model.AddBoolOr(
                    [works[i].Not() for i in range(start, start + target_value + 1)]
                )

    def add_soft_sequence_constraint(
        self,
        works: List[cp_model.IntVar],
        constraint: Dict,
        target_params_label: List[str],
        target_params_value: List[int],
    ) -> None:
        works_tuples = [
            key
            for key, value in self.work.items()
            for work_search in works
            if value == work_search
        ]
        min_values = [min(column) for column in zip(*works_tuples)]
        max_values = [max(column) for column in zip(*works_tuples)]
        prefix = "sequence_constraint" + "_".join(
            f"{str(mini)}:{str(maxi)}" for mini, maxi in zip(min_values, max_values)
        )
        target_params = "/".join(
            f"{label}_{str(value)}"
            for label, value in zip(target_params_label, target_params_value)
        )

        if constraint["penalty"] != 0:
            if (
                constraint["operator"] == "at_least"
                or constraint["operator"] == "equal"
            ):
                for length in range(0, constraint["target_value"]):
                    for start in range(len(works) - length + 1):
                        span = BuildModel.negated_bounded_span(works, start, length)
                        name = (
                            f"-> {target_params} under_span(start={start}, "
                            + f"length={length}) of soft_min="
                            + str(constraint["target_value"])
                        )
                        lit = self.model.NewBoolVar(prefix + name)
                        span.append(lit)
                        self.model.AddBoolOr(span)
                        self.obj_bool_vars.append(lit)
                        self.obj_bool_coeffs.append(
                            constraint["penalty"]
                            * (constraint["target_value"] - length)
                        )
            if constraint["operator"] == "at_most" or constraint["operator"] == "equal":
                for length in range(constraint["target_value"] + 1, len(works) + 1):
                    for start in range(len(works) - length + 1):
                        span = BuildModel.negated_bounded_span(works, start, length)
                        name = (
                            f"-> {target_params} over_span(start={start}, "
                            + f"length={length}) of soft_max="
                            + str(constraint["target_value"])
                        )
                        lit = self.model.NewBoolVar(prefix + name)
                        span.append(lit)
                        self.model.AddBoolOr(span)
                        self.obj_bool_vars.append(lit)
                        self.obj_bool_coeffs.append(
                            constraint["penalty"]
                            * (length - constraint["target_value"])
                        )

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

    def add_order_constraint(
        self, works: List[cp_model.IntVar], constraint: Dict
    ) -> None:
        works_tuples = [
            key
            for key, value in self.work.items()
            for work_search in works
            if value == work_search
        ]
        transition = [work.Not() for work in works]
        if constraint["hard_constraint"]:
            self.model.AddBoolOr(transition)
        else:
            trans_var = self.model.NewBoolVar(
                f"transition ({' '.join(str(works_tuples))})"
            )
            transition.append(trans_var)
            self.model.AddBoolOr(transition)
            self.obj_bool_vars.append(trans_var)
            self.obj_bool_coeffs.append(constraint["penalty"])

    def add_request_objetive(
        self, works: List[cp_model.IntVar], constraint: Dict
    ) -> None:
        for work in works:
            self.obj_bool_vars.append(work)
            self.obj_bool_coeffs.append(constraint["penalty"])

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
