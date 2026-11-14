const search = document.getElementById('search');
if (search) {
  search.addEventListener('input', function () {
    const term = this.value.toLowerCase();
    document.querySelectorAll('#medicineRows tr').forEach(row => {
      row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
    });
  });
}
