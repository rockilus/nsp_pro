from typing import Dict, List

from shared.schemas import LinkShift, Shift

from src.services.base_service import BaseService


class LinkShiftService(BaseService):
    def create_link_shift(self, link_shift: LinkShift) -> LinkShift:
        shifts = self.collection.shift_db.get_shifts_by_ids(link_shift.shift_ids)
        link_shifts = self.collection.link_shift_db.get_link_shifts(link_shift.team_id)
        valid = link_shift.validate(shifts, link_shifts)
        if valid.is_valid:
            return self.collection.link_shift_db.create_link_shift(link_shift)
        raise ValueError("LinkShift is not valid: " + valid.message)

    def update_link_shift(self, link_shift: LinkShift) -> LinkShift:
        shifts = self.collection.shift_db.get_shifts_by_ids(link_shift.shift_ids)
        link_shifts = self.collection.link_shift_db.get_link_shifts(link_shift.team_id)
        link_shifts = [ls for ls in link_shifts if ls.id != link_shift.id]
        valid = link_shift.validate(shifts, link_shifts)
        if valid.is_valid:
            return self.collection.link_shift_db.update_link_shift(link_shift)
        raise ValueError("LinkShift is not valid: " + valid.message)

    def update_link_shift_upon_shift_update(
        self, shift: Shift
    ) -> Dict[str, List[LinkShift | str]]:
        ls_shift = self.collection.link_shift_db.get_link_shifts_by_shift_id(shift.id)
        shifts_ids = list(set(shift_id for ls in ls_shift for shift_id in ls.shift_ids))
        shifts = self.collection.shift_db.get_shifts_by_ids(shifts_ids)
        link_shifts = self.collection.link_shift_db.get_link_shifts(shift.team_id)

        out: Dict[str, List[LinkShift | str]] = {"updated": [], "deleted": []}
        for ls in ls_shift:
            if shift.id in ls.shift_ids:
                ls_others = [ls_o for ls_o in link_shifts if ls_o.id != ls.id]
                shifts_ls = [s for s in shifts if s.id in ls.shift_ids]
                valid = ls.validate(shifts_ls, ls_others)
                if valid.is_valid:
                    out["updated"].append(
                        self.collection.link_shift_db.update_link_shift(ls)
                    )
                else:
                    self.collection.link_shift_db.delete_link_shift(ls.id)
                    out["deleted"].append(ls.id)
        return out

    def update_link_shift_upon_shift_delete(
        self, shift: Shift
    ) -> Dict[str, List[LinkShift | str]]:
        ls_shift = self.collection.link_shift_db.get_link_shifts_by_shift_id(shift.id)
        shifts_ids = list(
            set(
                shift_id
                for ls in ls_shift
                for shift_id in ls.shift_ids
                if shift_id != shift.id
            )
        )
        shifts = self.collection.shift_db.get_shifts_by_ids(shifts_ids)
        link_shifts = self.collection.link_shift_db.get_link_shifts(shift.team_id)

        out: Dict[str, List[LinkShift | str]] = {"updated": [], "deleted": []}
        for ls in link_shifts:
            if shift.id in ls.shift_ids:
                ls.shift_ids.remove(shift.id)
        for ls in ls_shift:
            ls_others = [ls_o for ls_o in link_shifts if ls_o.id != ls.id]
            ls.shift_ids.remove(shift.id)
            shifts_ls = [s for s in shifts if s.id in ls.shift_ids]
            valid = ls.validate(shifts_ls, ls_others)
            if valid.is_valid:
                out["updated"].append(
                    self.collection.link_shift_db.update_link_shift(ls)
                )
            else:
                self.collection.link_shift_db.delete_link_shift(ls.id)
                out["deleted"].append(ls.id)
        return out
