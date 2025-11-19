"""Shift color mappings (backend copy of frontend ShiftColorMappings).

Provides a mapping from the frontend color keys to hex values so the
backend can resolve color names (e.g. "orange") to concrete hex colors
for Excel exports.

Each entry contains `background` (100), `sample` (500) and `text` (900)
matching the MUI palette usage in the frontend.
"""

SHIFT_COLOR_MAPPINGS = {
    "pink": {
        "background": "#f8bbd0",
        "sample": "#e91e63",
        "text": "#880e4f",
    },
    "purple": {
        "background": "#e1bee7",
        "sample": "#9c27b0",
        "text": "#4a148c",
    },
    "deepPurple": {
        "background": "#d1c4e9",
        "sample": "#673ab7",
        "text": "#311b92",
    },
    "indigo": {
        "background": "#c5cae9",
        "sample": "#3f51b5",
        "text": "#1a237e",
    },
    "blue": {
        "background": "#bbdefb",
        "sample": "#2196f3",
        "text": "#0d47a1",
    },
    "lightBlue": {
        "background": "#b3e5fc",
        "sample": "#03a9f4",
        "text": "#01579b",
    },
    "cyan": {
        "background": "#b2ebf2",
        "sample": "#00bcd4",
        "text": "#006064",
    },
    "teal": {
        "background": "#b2dfdb",
        "sample": "#009688",
        "text": "#004d40",
    },
    "lightGreen": {
        "background": "#dcedc8",
        "sample": "#8bc34a",
        "text": "#33691e",
    },
    "lime": {
        "background": "#f0f4c3",
        "sample": "#cddc39",
        "text": "#827717",
    },
    "yellow": {
        "background": "#fff9c4",
        "sample": "#ffeb3b",
        "text": "#f57f17",
    },
    "orange": {
        "background": "#ffe0b2",
        "sample": "#ff9800",
        "text": "#e65100",
    },
    "deepOrange": {
        "background": "#ffccbc",
        "sample": "#ff5722",
        "text": "#bf360c",
    },
    "brown": {
        "background": "#d7ccc8",
        "sample": "#795548",
        "text": "#3e2723",
    },
}

# Fallback/default colors used when a named mapping isn't found.
DEFAULT_SHIFT_COLOR = {
    "background": "#f5f5f5",
    "sample": "#9e9e9e",
    "text": "#212121",
}
