
// listen for add book form submitted
document.addEventListener('DOMContentLoaded', (event) => {

    const bookForm = document.getElementById('book-form');
    bookForm.addEventListener('submit', AddBook);
});

//called when book is added
async function AddBook(event) {
    try {
        
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);

        // send FormData object that multer will process
        const response = await fetch('/api/add-book', {
            method: 'POST',
            body: toSend
        });

        if (!res.ok) throw res.statusText;

        const result = await response.json();

        if (result.success) window.location.href = '/';
        else {
            console.log(result.message);
            window.location.href = '/add-book';
        }

    } catch (err) {
        throw new Error(err);
    }
}