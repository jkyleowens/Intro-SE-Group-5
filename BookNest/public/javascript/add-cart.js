// content loaded, setup event listeneres
document.addEventListener('DOMContentLoaded', (event) => {

    const add_form = document.getElementsByName('add-cart-form');
    add_form.forEach(form => form.addEventListener('submit', AddCart));
});

async function AddCart(event) {
    event.preventDefault();
    const form = event.target;

    const formData = new FormData(form);
    const isbn = formData.get('isbn');
    const quantity = Number(formData.get('quantity'));
    const toSend = JSON.stringify({ isbn: isbn, quantity: quantity});

    try {
        const res = await fetch('/api/add-cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: toSend
        });

        if (!res.ok) throw 'error posting /api/add-cart';
        if (res.success == false) throw 'adding to cart was unsuccessful';
        window.location.href = '/catalog';
    } catch (err) {
        console.error(err);
        window.location.href='/';
    }
}