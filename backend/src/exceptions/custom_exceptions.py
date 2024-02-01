class NoKeyProvidedError(Exception):
    def __init__(self, message="No key provided"):
        self.message = message
        super().__init__(self.message)


class NoSolutionError(Exception):
    def __init__(self, message="No solution found"):
        self.message = message
        super().__init__(self.message)
