package com.ccruce.backend.exception;

public class UploadTooLargeException extends RuntimeException {
    public UploadTooLargeException() {
        super("Certificate files must be 5 MiB or smaller.");
    }
}
