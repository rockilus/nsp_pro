from shared.schemas import Worker

from scripts.setup_database import worker_db


def update_worker(worker_updated: Worker) -> Worker:
    worker_exsiting = worker_db.get_worker_by_id(worker_updated.id)
    if worker_updated.acronym != worker_exsiting.acronym:
        worker_updated.acronym_custom = True
    if (
        worker_updated.name != worker_exsiting.name
        and not worker_updated.acronym_custom
    ):
        workers = worker_db.get_workers_not_deleted(worker_updated.team_id)
        acronyms = [w.acronym for w in workers if w.id != worker_updated.id]
        worker_updated.acronym = generate_acronym(worker_updated.name, acronyms)
    worker_saved = worker_db.update_worker(worker_updated)
    return worker_saved


def generate_acronym(input_string: str, existing_acronyms: list) -> str:
    if not input_string.strip():
        return ''

    words = input_string.split()

    # Generate the initial acronym (first letter of each word, John Smith -> JS)
    acronym = ''.join(word[0].upper() for word in words)
    if acronym not in existing_acronyms:
        return acronym

    # If both are taken, add a dash and the next available integer starting from 2
    # (John Smith -> JS-2)
    counter = 2
    while True:
        new_acronym = f"{acronym}-{counter}"
        if new_acronym not in existing_acronyms:
            return new_acronym
        counter += 1
