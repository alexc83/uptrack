package com.ccruce.backend.exception;

public class UploadFailedException extends RuntimeException {

    public UploadFailedException(String message) {
        super(message);
    }
}
