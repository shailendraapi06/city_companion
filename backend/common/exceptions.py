from rest_framework import status
from rest_framework.views import exception_handler

from common.responses import error_response


def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler ensuring all framework-level exceptions
    (e.g., 401 Unauthorized, 403 Forbidden, 404 Not Found, 400 Bad Request)
    are returned in the standard response envelope format.
    Ref: API_Specification.md §1.3 & §1.4
    """
    response = exception_handler(exc, context)

    if response is not None:
        if isinstance(response.data, dict) and "success" in response.data:
            return response

        status_code = response.status_code

        if status_code == status.HTTP_401_UNAUTHORIZED:
            code = "UNAUTHORIZED"
            message = "Authentication credentials were not provided or are invalid."
            if isinstance(response.data, dict) and "detail" in response.data:
                message = str(response.data["detail"])
        elif status_code == status.HTTP_403_FORBIDDEN:
            code = "UNAUTHORIZED"
            message = "You do not have permission to perform this action."
            if isinstance(response.data, dict) and "detail" in response.data:
                message = str(response.data["detail"])
        elif status_code == status.HTTP_404_NOT_FOUND:
            code = "NOT_FOUND"
            message = "Resource not found."
            if isinstance(response.data, dict) and "detail" in response.data:
                message = str(response.data["detail"])
        elif status_code == status.HTTP_400_BAD_REQUEST:
            code = "VALIDATION_ERROR"
            message = "Invalid request parameters."
            if isinstance(response.data, dict):
                messages = []
                for field, errors in response.data.items():
                    if isinstance(errors, list):
                        messages.append(f"{field}: {' '.join(str(e) for e in errors)}")
                    else:
                        messages.append(f"{field}: {errors}")
                if messages:
                    message = "; ".join(messages)
            elif isinstance(response.data, list):
                message = "; ".join(str(e) for e in response.data)
        else:
            code = "INTERNAL_ERROR"
            message = "An internal server error occurred."

        return error_response(code=code, message=message, status_code=status_code)

    return response
