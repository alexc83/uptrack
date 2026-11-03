package com.ccruce.backend.exception;

/** Thrown when all concurrent upload-validation slots are in use; never queues. */
public class UploadBusyException extends RuntimeException {

    public UploadBusyException() {
        super("The upload service is busy. Please try again shortly.");
    }
}
