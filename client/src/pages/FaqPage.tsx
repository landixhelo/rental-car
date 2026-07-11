export default function FaqPage() {
  const items = [
    ["Si funksionon rezervimi?", "Zgjidh makinën, datat, lokacionet, extras dhe pagesën."],
    ["Çfarë dokumentesh duhen?", "Patentë dhe ID. Mund t’i ngarkosh gjatë rezervimit."],
    ["A mund ta anuloj?", "Po, nga Rezervimet e Mia deri sa statusi e lejon."],
    ["Si paguaj?", "Cash, transfer ose kartë (simulim i sigurt)."],
  ];

  return (
    <div className="section narrow">
      <h1>FAQ</h1>
      {items.map(([q, a]) => (
        <details key={q} className="panel" open>
          <summary>{q}</summary>
          <p className="muted">{a}</p>
        </details>
      ))}
    </div>
  );
}
