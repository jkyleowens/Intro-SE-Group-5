// content loaded, setup event listeneres
document.addEventListener('DOMContentLoaded', (event) => {

    const remove_form = document.getElementsByName('remove-cart');
    remove_form.forEach(form => form.addEventListener('submit', RemoveCart));
});

async function RemoveCart(event) {
    event.preventDefault();
    const form = event.target;

    const formData = new FormData(form);
    const isbn = formData.get('isbn');
    const quantity = Number(formData.get('quantity'));
    const toSend = JSON.stringify({ isbn: isbn, quantity: quantity * -1});

    try {
        const res = await fetch('/api/remove-cart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: toSend
        });

        if (!res.ok) throw 'error posting /api/remove-cart';
        if (res.success == false) throw 'adding to cart was unsuccessful';
        window.location.href = '/cart';
    } catch (err) {
        console.error(err);
        window.location.href='/';
    }
}