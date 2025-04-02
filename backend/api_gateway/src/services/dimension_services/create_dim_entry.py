from shared.schemas import DimEntry

from src.scripts.setup_database import dim_entry_db, dimension_db


def create_dim_entry(dim_entry: DimEntry) -> DimEntry:
    dimension = dimension_db.get_dimension_by_id(dim_entry.dimension_id)
    if dimension is None:
        raise ValueError("Dimension not found")
    de_created = dim_entry_db.create_dim_entry(dim_entry)
    return de_created
