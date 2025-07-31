// Dynamically load Header and Footer into the site
export function renderWithTemplate(template, parentElement) {
    if (template && parentElement){
        parentElement.innerHTML = template;
    }
}

export async function loadTemplate(path) {
    try{
        const response = await fetch(path);
        if (!response.ok){
            throw new Error(`HTTP error status: ${response.status}`)
        }
        const template = await response.text();
        return template;
    } catch(error){
        console.error("Error fetching data ", error)
    }
}

export async function loadHeaderFooter() {
    // load header
    const headerTemplate = await loadTemplate("./partials/header.html");
    const headerElement = document.getElementById("main-header");
    renderWithTemplate(headerTemplate, headerElement);

    //  Responsive menu using hamburger
    const hamburgerBtn = document.getElementById("hamburger");
    const navigation = document.getElementById("navigation");
    if(hamburgerBtn && navigation){
        hamburgerBtn.addEventListener("click", () => {
            navigation.classList.toggle("open");
            hamburgerBtn.classList.toggle("open");
        })
    }

    // load footer
    const footerTemplate = await loadTemplate("./partials/footer.html");
    const footerElement = document.getElementById("main-footer");
    renderWithTemplate(footerTemplate, footerElement);

     // now footer exists in the DOM → set year
    const currentYear = document.querySelector("#currentYear");
    if (currentYear) {
       currentYear.textContent = new Date().getFullYear();
    }
}
