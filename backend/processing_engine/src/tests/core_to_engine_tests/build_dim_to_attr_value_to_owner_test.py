from shared.schemas import DimensionEntryType, DimensionType, EngineInputsAugmented

from core_to_engine_service.build_dim_to_attr_value_to_owner import (
    build_dim_to_attr_value_to_owner,
)


# pylint: disable=R0801, too-few-public-methods
class TestBuildDimToAttrToOwner:
    def test_build_dim_to_attr_value_to_owner_workers(
        self, engine_inputs_special_days: EngineInputsAugmented
    ) -> None:
        out = build_dim_to_attr_value_to_owner(
            engine_inputs_special_days.workers,
            engine_inputs_special_days.dimensions,
            engine_inputs_special_days.dim_entries,
            engine_inputs_special_days.attributes,
        )
        assert out is not None
        assert isinstance(out, dict)

        dim_worker = [
            dim
            for dim in engine_inputs_special_days.dimensions
            if dim.dim_types == [DimensionType.WORKER]
        ]

        dim_ids = sorted(list(set(dim.id for dim in dim_worker)))
        assert sorted(list(out.keys())) == dim_ids

        for dim in dim_worker:
            if dim.entry_type == DimensionEntryType.DIM_ENTRIES:
                dim_entry_names = sorted(
                    list(
                        set(
                            dim_entry.name
                            for dim_entry in engine_inputs_special_days.dim_entries
                            if dim_entry.dimension_id == dim.id
                        )
                    )
                )
                assert sorted(list(out[dim.id].keys())) == dim_entry_names

                dim_entries = [
                    dim_entry
                    for dim_entry in engine_inputs_special_days.dim_entries
                    if dim_entry.dimension_id == dim.id
                ]
                for dim_entry in dim_entries:
                    worker_ids = sorted(
                        list(
                            set(
                                attr_value.owner_id
                                for attr_value in engine_inputs_special_days.attributes
                                if dim_entry.id in attr_value.dim_entry_ids
                            )
                        )
                    )
                    assert sorted(list(out[dim.id][dim_entry.name])) == worker_ids
            elif dim.entry_type == DimensionEntryType.BOOL:
                assert sorted(list(out[dim.id].keys())) == [False, True]
                for bool_value in [True, False]:
                    worker_ids = sorted(
                        list(
                            set(
                                attr_value.owner_id
                                for attr_value in engine_inputs_special_days.attributes
                                if attr_value.dimension_id == dim.id
                                and bool_value == attr_value.value
                            )
                        )
                    )
                    assert sorted(list(out[dim.id][bool_value])) == worker_ids

    def test_build_dim_to_attr_value_to_owner_shifts(
        self, engine_inputs_special_days: EngineInputsAugmented
    ) -> None:
        out = build_dim_to_attr_value_to_owner(
            engine_inputs_special_days.shifts,
            engine_inputs_special_days.dimensions,
            engine_inputs_special_days.dim_entries,
            engine_inputs_special_days.attributes,
        )
        assert out is not None
        assert isinstance(out, dict)

        dim_ids = sorted(
            list(
                set(
                    dim.id
                    for dim in engine_inputs_special_days.dimensions
                    if dim.dim_types == [DimensionType.SHIFT]
                )
            )
        )
        assert sorted(list(out.keys())) == dim_ids

        dim_shift = [
            dim
            for dim in engine_inputs_special_days.dimensions
            if dim.dim_types == [DimensionType.SHIFT]
        ]

        for dim in dim_shift:
            if dim.entry_type == DimensionEntryType.DIM_ENTRIES:
                dim_entry_names = sorted(
                    list(
                        set(
                            dim_entry.name
                            for dim_entry in engine_inputs_special_days.dim_entries
                            if dim_entry.dimension_id == dim.id
                        )
                    )
                )
                assert sorted(list(out[dim.id].keys())) == dim_entry_names

                dim_entries = [
                    dim_entry
                    for dim_entry in engine_inputs_special_days.dim_entries
                    if dim_entry.dimension_id == dim.id
                ]
                for dim_entry in dim_entries:
                    shift_ids = sorted(
                        list(
                            set(
                                attr_value.owner_id
                                for attr_value in engine_inputs_special_days.attributes
                                if dim_entry.id in attr_value.dim_entry_ids
                            )
                        )
                    )
                    assert sorted(list(out[dim.id][dim_entry.name])) == shift_ids
            elif dim.entry_type == DimensionEntryType.BOOL:
                assert sorted(list(out[dim.id].keys())) == [False, True]
                for bool_value in [True, False]:
                    shift_ids = sorted(
                        list(
                            set(
                                attr_value.owner_id
                                for attr_value in engine_inputs_special_days.attributes
                                if attr_value.dimension_id == dim.id
                                and bool_value == attr_value.value
                            )
                        )
                    )
                    assert sorted(list(out[dim.id][bool_value])) == shift_ids
