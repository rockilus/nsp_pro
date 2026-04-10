import json
import os
import re
from collections import defaultdict
from statistics import mean
from typing import cast

import pandas as pd


def build_output_table(directory: str) -> pd.DataFrame:
    files_content, case_names = load_json_files(directory)
    params_to_outputs = files_content_to_params_to_outputs(files_content, case_names)
    params_to_outputs_mean: dict[tuple, dict[str, str | dict]] = {}
    for params_tuple, case_dict in params_to_outputs.items():
        params_to_outputs_mean.setdefault(params_tuple, {})["outputs"] = (
            aggregate_dicts(case_dict["outputs"])  # type: ignore
        )
        params_to_outputs_mean[params_tuple].update(
            {
                "case_name": case_dict["case_name"],  # type: ignore
                "params": case_dict["params"],  # type: ignore
            }
        )
    df = create_params_outputs_table(params_to_outputs_mean)
    return df


def load_json_file(file_path: str) -> dict:
    with open(file_path, encoding="utf-8") as file:
        return json.load(file)


def load_json_files(directory: str) -> tuple[list[dict], list[str]]:
    """Load all JSON files in a directory."""
    files_content: list[dict] = []
    case_names: list[str] = []
    for filename in os.listdir(directory):
        if filename.endswith(".json"):
            match = re.match(r"(.+)_\d+\.\d+\.json", filename)  # Extract case name
            case_name = "no_case_name"
            if match:
                case_name = match.group(1)
            file_path = os.path.join(directory, filename)
            file_content = load_json_file(file_path)
            files_content.append(file_content)
            case_names.append(case_name)
    return files_content, case_names


def files_content_to_params_to_outputs(
    files_content: list[dict], case_names: list[str]
) -> dict[tuple, dict[str, str | list[dict]]]:
    out: dict[tuple, dict[str, str | list[dict]]] = {}
    for file_content, case_name in zip(files_content, case_names):
        params = file_content.get("params", {})
        for key in ["subsolvers", "ignore_subsolvers", "restart_algorithms"]:
            if key in params and params[key] is not None:
                params[key] = ", ".join(params[key])
        outputs = {
            k: v for k, v in file_content.items() if k not in ["params", "log_output"]
        }
        params_tuple = tuple(
            sorted(file_content["params"].items())
        )  # Group by params only
        if params_tuple not in out:
            out[params_tuple] = {
                "case_name": case_name,
                "params": params,
                "outputs": [],
            }
        out[params_tuple]["outputs"].append(outputs)  # type: ignore

    return out


def aggregate_dicts(dict_list: list[dict]) -> dict:
    if not dict_list:
        return {}

    aggregated = defaultdict(list)

    # Collect values for each key
    for d in dict_list:
        for key, value in d.items():
            aggregated[key].append(value)

    # Compute averages for numerical values and select one for non-numerical
    result = {}
    for key, values in aggregated.items():
        if all(isinstance(v, (int, float)) for v in values):
            result[key] = round(mean(values))
        else:
            result[key] = values[0]  # Take any one of the values (first in this case)

    return result


def create_params_outputs_table(
    params_to_outputs: dict[tuple, dict[str, str | dict]],
) -> pd.DataFrame:
    columns = {
        case: cast(str, params_to_outputs[case]["case_name"])
        for case in params_to_outputs
    }
    # Sort the columns by alphabetical order
    columns = dict(sorted(columns.items(), key=lambda item: item[1]))
    # Collect all possible output and parameter keys
    all_outputs: set[str] = set()
    all_params: set[str] = set()

    for case in params_to_outputs.values():
        all_outputs.update(case["outputs"].keys())  # type: ignore
        all_params.update(case["params"].keys())  # type: ignore

    # Create table rows
    rows = []
    row_labels = []

    # Add label row
    row_labels.append("Outputs")
    rows.append([""] * len(params_to_outputs))

    # Add output rows
    for output in sorted(all_outputs):
        row_labels.append(output)
        rows.append(
            [
                params_to_outputs[case]["outputs"].get(output, None)  # type: ignore
                for case in columns
            ]
        )

    # Add separator row
    row_labels.append("")
    rows.append([""] * len(params_to_outputs))

    # Add label row
    row_labels.append("Parameters")
    rows.append([""] * len(params_to_outputs))

    # Add parameter rows
    for param in sorted(all_params):
        row_labels.append(param)
        rows.append(
            [
                params_to_outputs[case]["params"].get(param, None)  # type: ignore
                for case in columns
            ]
        )

    # Create DataFrame with updated column names
    df = pd.DataFrame(rows, index=row_labels, columns=list(columns.values()))

    return df


def save_output_to_csv(df: pd.DataFrame, file_path: str) -> None:
    df.to_csv(file_path, index=True, encoding="utf-8")


def save_output_to_xlsx(df: pd.DataFrame, file_path: str) -> None:
    df.to_excel(file_path, index=True, engine="xlsxwriter")


def filter_files_by_params(directory: str, params_list: list[dict]) -> list[dict]:
    files_content, _ = load_json_files(directory)
    filtered_content = [
        file_content
        for file_content in files_content
        if file_content.get("params") in params_list
    ]
    return filtered_content


def save_log_output_to_txt(json_file_path: str, txt_file_path: str) -> None:
    file_content = load_json_file(json_file_path)
    log_output = file_content.get("log_output", "")
    with open(txt_file_path, "w", encoding="utf-8") as txt_file:
        txt_file.write(log_output)


# if __name__ == "__main__":
#     current_folder = os.path.dirname(__file__)
#     dir_path_output = os.path.join(current_folder, "parameter_test_output")

#     build_output_table(dir_path_output)

# import json
# import os
# import re
# from typing import Dict, List

# import pandas as pd


# def load_json_file(file_path: str) -> Dict:
#     """Load the content of a given JSON file."""
#     with open(file_path, "r", encoding="utf-8") as file:
#         content = json.load(file)
#     return {
#         k: v for k, v in content.items() if k not in ["params", "log_output"]
#     }


# def process_json_files(directory: str) -> Dict[str, List[Dict]]:
#     """Process all JSON files in a directory and group data by case name."""
#     data: Dict[str, List[Dict]] = {}
#     for filename in os.listdir(directory):
#         if filename.endswith(".json"):
#             match = re.match(
#                 r"(.+)_\d+\.\d+\.json", filename
#             )  # Extract case name
#             if match:
#                 case_name = match.group(1)
#                 file_path = os.path.join(directory, filename)
#                 file_data = load_json_file(file_path)

#                 if case_name not in data:
#                     data[case_name] = []
#                 data[case_name].append(file_data)
#     return data


# def calculate_averages(data: Dict[str, List[Dict]]) -> pd.DataFrame:
#     """
#     Calculate average values for each case, handling both numeric and
#     non-numeric values.
#     """
#     averaged_data = {}
#     for case, results in data.items():
#         df_case = pd.DataFrame(results)
#         averaged_case = {}
#         for column in df_case.columns:
#             if pd.api.types.is_numeric_dtype(df_case[column]):
#                 averaged_case[column] = round(df_case[column].mean(), 0)
#             else:
#                 averaged_case[column] = df_case[column].iloc[0]
#         averaged_data[case] = averaged_case
#     df_result = pd.DataFrame(averaged_data)
#     return df_result[sorted(df_result.columns)]
