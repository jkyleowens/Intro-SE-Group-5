
// listen for add to cart submitted
document.addEventListener('DOMContentLoaded', (event) => {

    const forms = document.getElementsByName('add-cart-form');

    forms.forEach(form => {
        form.addEventListener('submit', AddCart);
    })
});

//called when book is added
async function AddCart(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const quantity = Number(data.quantity);
    const isbn = Number(data.isbn);
    
    try {

        if (!quantity || quantity == 0) throw 'quantity must be greater than 0';

        const toSend = JSON.stringify({ itemID: isbn, quantity: quantity });

        const response = await fetch('/api/add-cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: toSend
        });

        if (!response.ok) throw response.status;

        const result = await response.json();
        if (!result.success) console.error(result.message);
        
        window.location.href = '/home';

    } catch (err) {
        console.error('adding to cart failed! ' + err);
        window.location.href = '/';
    }
}