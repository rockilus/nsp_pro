class DocumentDoesNotExistError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class DocumentHasExtraFieldError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class DocumentNotUniqueError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class DocumentValidationError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class DocumentMultipleFoundError(Exception):
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)
