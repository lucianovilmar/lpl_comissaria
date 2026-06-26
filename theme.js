// Modo tema (padrão: dark)
const themeToggle = document.getElementById('themeToggle');

export function applyTheme(theme){
  document.body.classList.toggle('theme-dark', theme === 'dark');
  document.body.classList.toggle('theme-light', theme === 'light');
  if(themeToggle) themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
}

// carregar preferência
const savedTheme = localStorage.getItem('site-theme') || 'dark';
applyTheme(savedTheme);

if(themeToggle){
  themeToggle.addEventListener('click', ()=>{
    const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('site-theme', next);
  });
}