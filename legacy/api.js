window.AutoRentAPI = {
    baseUrl: "http://localhost:5000/api",

    async request(path, options = {}) {
        try {
            const res = await fetch(`${this.baseUrl}${path}`, {
                headers: { "Content-Type": "application/json" },
                ...options
            });
            if (!res.ok) throw new Error("API error");
            return await res.json();
        } catch (err) {
            console.warn("API unavailable, using localStorage:", err.message);
            return null;
        }
    },

    createReservation(reservation) {
        return this.request("/reservations", {
            method: "POST",
            body: JSON.stringify(reservation)
        });
    },

    createReview(review) {
        return this.request("/reviews", {
            method: "POST",
            body: JSON.stringify(review)
        });
    },

    createContact(message) {
        return this.request("/contact", {
            method: "POST",
            body: JSON.stringify(message)
        });
    }
};
