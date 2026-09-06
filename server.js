function generateDeck(elements) {
  let cards = [];

  elements.forEach((el, index) => {
    // Carta de Elemento
    cards.push({
      type: 'element',
      content: el.symbol,
      sub: el.name,
      validValences: el.val.split(',').map(v => v.trim())
    });

    // Carta de Valencia tomada del elemento
    const primeraValencia = el.val.split(',')[0].trim();
    cards.push({
      type: 'valence',
      content: primeraValencia,
      sub: 'Valencia'
    });
  });

  return cards.sort(() => Math.random() - 0.5);
}
