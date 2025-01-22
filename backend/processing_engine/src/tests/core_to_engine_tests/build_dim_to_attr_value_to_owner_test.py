from shared.schemas import EngineInputs

from core_to_engine_service.build_dim_to_attr_value_to_owner import (
    build_dim_to_attr_value_to_owner,
)


# pylint: disable=R0801, too-few-public-methods
class TestBuildDimToAttrToOwner:
    def test_build_dim_to_attr_value_to_owner_workers(
        self, engine_inputs_w10_s5_dim_w_loc: EngineInputs
    ) -> None:
        out = build_dim_to_attr_value_to_owner(
            engine_inputs_w10_s5_dim_w_loc.workers,
            engine_inputs_w10_s5_dim_w_loc.dimensions,
            engine_inputs_w10_s5_dim_w_loc.dim_entries,
            engine_inputs_w10_s5_dim_w_loc.attributes,
        )
        assert out is not None
        assert isinstance(out, dict)

        dim_ids = sorted(
            list(set(dim.id for dim in engine_inputs_w10_s5_dim_w_loc.dimensions))
        )
        assert sorted(list(out.keys())) == dim_ids

        for dim_id in dim_ids:
            dim_entry_names = sorted(
                list(
                    set(
                        dim_entry.name
                        for dim_entry in engine_inputs_w10_s5_dim_w_loc.dim_entries
                        if dim_entry.dimension_id == dim_id
                    )
                )
            )
            assert sorted(list(out[dim_id].keys())) == dim_entry_names

            dim_entries = [
                dim_entry
                for dim_entry in engine_inputs_w10_s5_dim_w_loc.dim_entries
                if dim_entry.dimension_id == dim_id
            ]
            for dim_entry in dim_entries:
                worker_ids = sorted(
                    list(
                        set(
                            attr_value.owner_id
                            for attr_value in engine_inputs_w10_s5_dim_w_loc.attributes
                            if dim_entry.id in attr_value.dim_entry_ids
                        )
                    )
                )
                assert sorted(list(out[dim_id][dim_entry.name])) == worker_ids
