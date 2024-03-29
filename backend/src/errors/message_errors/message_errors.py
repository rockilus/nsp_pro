class MessageTypeError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class MessageValueError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class MessageValidationError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)
