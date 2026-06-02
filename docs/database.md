# Database

PostgreSQL is the main database for the TicketBox API. Flyway is configured for database
migrations, and the current baseline migration intentionally does not create business tables.

The future schema work should define ownership by module and keep transaction boundaries explicit,
especially around ticket inventory and payment idempotency.

Spring Batch metadata tables may be initialized by Spring Batch in the development environment.
Those tables are infrastructure metadata, not TicketBox business schema.
