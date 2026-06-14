/**
 * Admin and organizer reporting module.
 *
 * <p>Responsibilities: organizer revenue summary, per-zone revenue breakdown, daily sales
 * trends, and completed-concert reporting. All data is read-only aggregation over
 * ticket sales and concert data exposed via cross-module ports.
 *
 * <p>Upstream dependencies:
 * <ul>
 *   <li>{@link com.ticketbox.module.concert.ConcertReportingPort} – owned-concert queries.</li>
 *   <li>{@link com.ticketbox.module.ticket.TicketSalesReportingPort} – revenue aggregates.</li>
 *   <li>{@code shared} – common utilities.</li>
 * </ul>
 */
@org.springframework.modulith.ApplicationModule(allowedDependencies = {"concert", "ticket", "shared"})
package com.ticketbox.module.admin;
