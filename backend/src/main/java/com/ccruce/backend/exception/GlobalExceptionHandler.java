package com.ccruce.backend.exception;

import com.ccruce.backend.dto.response.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException exception) {
        return buildResponse(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException exception) {
        return buildResponse(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(ConflictException exception) {
        return buildResponse(HttpStatus.CONFLICT, exception.getMessage());
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException exception) {
        return buildResponse(HttpStatus.UNAUTHORIZED, exception.getMessage());
    }

    @ExceptionHandler(UploadFailedException.class)
    public ResponseEntity<ErrorResponse> handleUploadFailed(UploadFailedException exception) {
        return buildResponse(HttpStatus.BAD_GATEWAY, exception.getMessage());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException exception) {
        return buildResponse(HttpStatus.FORBIDDEN, "You do not have permission to perform this action.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(this::formatFieldError)
                .collect(Collectors.joining("; "));

        return buildResponse(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ErrorResponse> handleMissingRequestPart(MissingServletRequestPartException exception) {
        return buildResponse(HttpStatus.BAD_REQUEST, "Certificate file is required.");
    }

    // Paths that no longer exist (or never did) and known paths called with an unsupported method. The framework's own
    // exception messages name internal details such as "No static resource ...", so only a generic message is returned.
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(NoResourceFoundException exception) {
        return buildResponse(HttpStatus.NOT_FOUND, "The requested resource was not found.");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException exception) {
        return buildResponse(HttpStatus.METHOD_NOT_ALLOWED, "The request method is not supported for this resource.");
    }

    @ExceptionHandler({org.springframework.http.converter.HttpMessageNotReadableException.class,
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
            org.springframework.web.bind.MissingServletRequestParameterException.class,
            org.springframework.web.multipart.MultipartException.class})
    public ResponseEntity<ErrorResponse> handleInvalidRequest(Exception exception) {
        return buildResponse(HttpStatus.BAD_REQUEST, "The request contains invalid or malformed data.");
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleUnsupportedMedia(Exception exception) {
        return buildResponse(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "The request content type is not supported.");
    }

    @ExceptionHandler({org.springframework.web.multipart.MaxUploadSizeExceededException.class,
            UploadTooLargeException.class})
    public ResponseEntity<ErrorResponse> handleUploadTooLarge(Exception exception) {
        return buildResponse(HttpStatus.PAYLOAD_TOO_LARGE, "Certificate files must be 5 MiB or smaller.");
    }

    @ExceptionHandler(RequestBodyTooLargeException.class)
    public ResponseEntity<ErrorResponse> handleRequestBodyTooLarge(RequestBodyTooLargeException exception) {
        return buildResponse(HttpStatus.PAYLOAD_TOO_LARGE, exception.getMessage());
    }

    @ExceptionHandler(UploadBusyException.class)
    public ResponseEntity<ErrorResponse> handleUploadBusy(UploadBusyException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .header("Retry-After", "5")
                .body(new ErrorResponse(HttpStatus.SERVICE_UNAVAILABLE.value(),
                        HttpStatus.SERVICE_UNAVAILABLE.getReasonPhrase(), exception.getMessage(), Instant.now()));
    }

    @ExceptionHandler({org.springframework.dao.DataIntegrityViolationException.class,
            org.springframework.dao.OptimisticLockingFailureException.class})
    public ResponseEntity<ErrorResponse> handleDataConflict(Exception exception) {
        return buildResponse(HttpStatus.CONFLICT, "The request conflicts with stored data.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnhandled(Exception exception) {
        // Exception messages/causes may contain SQL values or request data. Record type and
        // call sites, without logging their messages or sensitive argument values.
        log.error("Unhandled server failure: {} at {}", exception.getClass().getName(),
                java.util.Arrays.stream(exception.getStackTrace()).limit(12).map(StackTraceElement::toString).toList());
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.");
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(new ErrorResponse(
                status.value(),
                status.getReasonPhrase(),
                message,
                Instant.now()
        ));
    }

    private String formatFieldError(FieldError error) {
        return "%s: %s".formatted(error.getField(), error.getDefaultMessage());
    }
}