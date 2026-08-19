import dns from "node:dns";

// Railway has no working IPv6 route; Node 18+ prefers IPv6 and Gmail hangs.
dns.setDefaultResultOrder("ipv4first");
