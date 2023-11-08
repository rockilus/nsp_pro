import csv
import datetime
import os
import subprocess

from engine.model import Model
from utils.contants import Constants


def benchmark_track_func(
    model: Model,
) -> None:
    if os.environ.get("TEST_MODE") is not None:
        return
    response_dict = {}
    lines = model.solver.ResponseStats().split('\n')
    for line in lines:
        parts = line.split(': ')
        if len(parts) == 2:
            key, value = parts
            if value.isdigit():
                response_dict[key] = int(value)
            elif (
                '.' in value
                and all(char.isdigit() or char == '.' for char in value)
                and value.count('.') == 1
            ):
                response_dict[key] = float(value)  # type: ignore
            else:
                response_dict[key] = value

    file_path = (
        os.getcwd()
        + Constants.ENGINE_SAVED_FILE_PATH
        + Constants.BENCHMARK_LOG_FILE_NAME
    )
    fieldnames = [
        "date",
        "num_workers",
        "num_days",
        "num_shifts",
        "total_time",
        "setup_time",
        "solve_time",
        "variables_time",
        "constraints_time",
        "objective_time",
        'status',
        'objective',
        'best_bound',
        'integers',
        'booleans',
        'conflicts',
        'branches',
        'propagations',
        'integer_propagations',
        'restarts',
        'lp_iterations',
        'walltime',
        'usertime',
        'deterministic_time',
        'gap_integral',
        'solution_fingerprint',
        "commit",
    ]
    entry = {
        "date": get_date_time(),
        "num_workers": len(model.workers),
        "num_days": len(model.days),
        "num_shifts": len(model.shifts),
        "total_time": model.bt.total_end - model.bt.total_start,
        "setup_time": model.bt.full_setup_end - model.bt.full_setup_start,
        "solve_time": model.solver.WallTime(),
        "variables_time": model.bt.variables_end - model.bt.variables_start,
        "constraints_time": model.bt.constraints_end - model.bt.constraints_start,
        "objective_time": model.bt.objective_end - model.bt.objective_start,
        **response_dict,
        "commit": get_git_revision_hash(),
    }
    try:
        with open(file_path, "r", newline="", encoding="utf-8") as csvfile:
            csv.DictReader(csvfile, fieldnames=fieldnames)
        with open(file_path, "a", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writerow(entry)
    except FileNotFoundError:
        print("creating the file")
        with open(file_path, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerow(entry)


def get_date_time() -> str:
    return datetime.datetime.today().strftime("%Y-%m-%d %H:%M:%S")


def get_git_revision_hash() -> str:
    return subprocess.check_output(["git", "rev-parse", "HEAD"]).decode("ascii").strip()
