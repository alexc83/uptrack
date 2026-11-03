package com.ccruce.backend.exception;

/** Thrown when a non-multipart request body exceeds the configured byte limit. */
public class RequestBodyTooLargeException extends RuntimeException {

    public RequestBodyTooLargeException() {
        super("The request body is too large.");
    }
}
