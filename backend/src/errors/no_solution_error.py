class NoSolutionError(Exception):
    def __init__(self, message="No solution found"):
        self.message = message
        super().__init__(self.message)
