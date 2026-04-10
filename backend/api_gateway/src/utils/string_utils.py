def generate_acronym(input_string: str, existing_acronyms: list) -> str:
    if not input_string.strip():
        return ""

    words = [word for word in input_string.split() if word.strip()]

    # Generate the initial acronym (first letter of each word, John Smith -> JS)
    acronym = "".join(word[0].upper() for word in words)
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
