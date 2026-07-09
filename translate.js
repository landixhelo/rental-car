const translations = {
    sq: {
        cars: "Makinat",
        login: "Hyr",
        logout: "Dil",
        register: "Regjistrohu",
        admin: "Admin",
        language: "Gjuha"
    },

    en: {
        cars: "Cars",
        login: "Login",
        logout: "Logout",
        register: "Register",
        admin: "Admin",
        language: "Language"
    },

    it: {
        cars: "Auto",
        login: "Accedi",
        logout: "Esci",
        register: "Registrati",
        admin: "Admin",
        language: "Lingua"
    }
};

function changeLanguage(lang) {

    document
        .querySelectorAll("[data-translate]")
        .forEach(element => {

            const key =
                element.getAttribute("data-translate");

            element.innerText =
                translations[lang][key];
        });

    localStorage.setItem(
        "language",
        lang
    );
}

document.addEventListener("DOMContentLoaded", () => {

    const savedLang =
        localStorage.getItem("language") || "sq";

    changeLanguage(savedLang);

    document
        .querySelectorAll("[data-lang]")
        .forEach(btn => {

            btn.addEventListener("click", e => {

                e.preventDefault();

                changeLanguage(
                    btn.dataset.lang
                );
            });
        });
});