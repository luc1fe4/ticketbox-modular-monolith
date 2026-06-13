package com.ticketbox.shared.exception;

public class DuplicateIdempotencyKeyException extends RuntimeException{
    public DuplicateIdempotencyKeyException(String key){
        super("Request with Idempotency-Key [" + key + "] has already been processed.");
    }
}
