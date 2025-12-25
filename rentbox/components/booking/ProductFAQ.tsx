'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const FAQ_ITEMS = [
  {
    question: 'Kuidas tööriista kätte saada?',
    answer: 'Pärast broneeringu kinnitamist saad e-postile juurdepääsukoodi. Mine nutikapi juurde, sisesta kood ja kapp avaneb automaatselt. Võta tööriist välja ja alusta tööd.',
  },
  {
    question: 'Mis juhtub, kui tagastan hilja?',
    answer: 'Broneering pikeneb automaatselt ja hind arvutatakse vastavalt kasutatud ajale. Kui pärast broneeringu lõppu on ootel järgmine klient, võidakse nõuda trahvi.',
  },
  {
    question: 'Kas saan broneeringu tühistada?',
    answer: 'Jah, saad broneeringu tasuta tühistada kuni 24 tundi enne alguskuupäeva. Hilisema tühistamise korral tagastatakse 50% broneeringu summast.',
  },
  {
    question: 'Mis juhtub, kui tööriist läheb katki?',
    answer: 'Normaalne kulumine on kaetud. Kui tööriist läheb kasutamise ajal katki, võta meiega viivitamatult ühendust. Tahtlik kahjustamine või hoolimatusest tulenev rike tuleb hüvitada.',
  },
  {
    question: 'Kas saan tööriista enne kasutamist testida?',
    answer: 'Ei, meie süsteem ei toeta enne broneeringut testimist. Kõik tööriistad on kontrollitud ja töötavad. Kui tööriist ei tööta õigesti, võta meiega koheselt ühendust.',
  },
  {
    question: 'Kuidas toimub makse?',
    answer: 'Maksad online pangalingiga või kaardiga. Makse toimub kohe pärast broneeringu kinnitamist. Arve saadetakse e-postile.',
  },
]

export function ProductFAQ() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-white">Korduma kippuvad küsimused</h2>
      <Accordion type="single" collapsible className="space-y-2">
        {FAQ_ITEMS.map((item, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="bg-neutral-900/50 border border-neutral-800 rounded-lg px-6"
          >
            <AccordionTrigger className="text-left text-neutral-200 hover:text-white">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-neutral-400">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
