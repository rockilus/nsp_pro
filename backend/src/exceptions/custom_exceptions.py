class NoKeyProvidedError(Exception):
    def __init__(self, message="No key provided"):
        self.message = message
        super().__init__(self.message)
