const fs = require('fs');
const raw = fs.readFileSync('raw.txt', 'utf8');

const h2Regex = /<h2 class="wp-block-heading">(.*?)<\/h2>/g;
const audioRegex = /<audio[\s\S]*?src="(.*?)".*?><\/audio>/g;
const pRegex = /<p>([\s\S]*?)<\/p>/g;

let sections = [];
let versesText = [];

let pMatch;
while ((pMatch = pRegex.exec(raw)) !== null) {
  let text = pMatch[1].trim();
  if (text.includes('हर दिन केवल कुछ मिनट')) continue;
  if (text.includes('हर रोज चतुरासी जी का पूरा पाठ')) continue;
  if (text.includes('भवजल निधि कौ नाव')) continue;
  if (text.includes('निरखै जुगल किशोर भोर')) continue;
  if (text.includes('छः पद विभास माँझ')) continue;
  if (text.includes('॥ श्री ललिता जू की जय ॥')) continue;
  
  text = text.replace(/<br\s*\/?>/gi, '___NEWLINE___');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/___NEWLINE___/g, '\n').trim();
  text = text.replace(/\n\s+/g, '\n');
  text = text.replace(/&#8211;/g, '-');
  
  let verseMatches = text.match(/॥(\d+)॥/g);
  let verseMatch = verseMatches ? verseMatches[verseMatches.length - 1].match(/॥(\d+)॥/) : null;
  let num = 0;
  if (verseMatch) {
    num = parseInt(verseMatch[1], 10);
  } else {
      continue; 
  }
  
  versesText.push({
    number: num,
    text: text
  });
}

const sectionAudio = [];
let audioMatch;
while ((audioMatch = audioRegex.exec(raw)) !== null) {
    if (!audioMatch[1].includes('चतुरासी-जी-की-महिमा')) {
        sectionAudio.push(audioMatch[1]);
    }
}

let fullVerse63 = "मोहन मदन त्रिभंगी । मोहन मुनि-मन-रंगी ॥\nमोहन मुनि सघन प्रगट परमानन्द, गुन गंभीर गुपाला ।\nसीस किरीट श्रवण मणि-कुण्डल, उर मंडित बनमाला ॥\nपीताम्बर तन-धातु विचित्रित, कल किंकिनि कटि चंगी ।\nनख-मनि तरनि चरन सरसीरुह, मोहन मदन त्रिभंगी ॥\n\nमोहन बेनु बजावै । इहि रव नारि बुलावै ॥\nआईं ब्रज नारि सुनत वंशी-रव, गृह पति बंधु बिसारे ।\nदरसन मदन गुपाल मनोहर, मनसिज ताप निवारे ॥\nहरषित वदन, बंक अवलोकन, सरस मधुर धुनि गावै ।\nमधुमय श्याम समान अधर धरि, मोहन बेनु बजावै ॥\n\nरास रच्यौ वन माहीं । विमल कलपतरु छाहीं ॥\nविमल कलपतरु तीर सुपेसल, शरद रैन वर चन्दा ।\nशीतल मंद सुगंध पवन बहै, तहाँ खेलत नंदनन्दा ॥\nअद्भुत ताल मृदंग मनोहर, किंकिणि शब्द कराहीं ।\nयमुना पुलिन रसिक रस-सागर, रास रच्यौ वन माहीं ॥\n\nदेखत मधुकर केली । मोहे खग, मृग, बेली ॥\nमोहे मृग-धेनु सहित सुर-सुन्दरि, प्रेम मगन पट छूटे ।\nउडुगन चकित, थकित शशि मंडल, कोटि मदन मन लूटे ॥\nअधर पान परिरंभन अतिरस, आनँद मगन सहेली ।\n(जै श्री) हित हरिवंश रसिक सचु पावत, देखत मधुकर केली ॥63॥";

let idx63 = versesText.findIndex(v => v.number === 63);
if (idx63 !== -1) {
    versesText.splice(idx63, 1);
}

versesText.push({
  number: 63,
  text: fullVerse63
});

let fullVerse59 = "तेरे हित लैन आई, वन तें श्याम पठाई,\nहरत कामिनि घन कदन काम कौ ।\nकाहे कौं करत बाधा, सुनि री चतुर राधा,\nभेटि कैं मेटि री माई प्रगट जगत भौ ॥\nदेखि री रजनी नीकी, रचना रुचिर पी की,\nपुलिन नलिन नभ उदित रोहिनी-धौं ।\nतू तौऽव सखी सयानी, तैं मेरी एकौ न मानी,\nहौं तोसौं कहत हारी जुवति जुगति सौं ॥\nमोहन लाल छबीलौ, अपने रंग रँगीलौ,\nमोहत बिहंग पशु मधुर मुरली रौ ।\nते तौऽव गनत तन जीवन जोवन तव,\n(जै श्री) हित हरिवंश हरि भजहि भामिनि जौ ॥58॥\n\nयह जु एक मन बहुत ठौर करि, कहि कौनें सचु पायौ ।\nजहाँ-तहाँ विपति जार-जुवती लौं, प्रगट पिंगला गायौ ॥\nद्वै तुरंग पर जोर चढ़त हठ, परत कौन पै धायौ ।\nकहि धौं कौन अंक पर राखै, जो गनिका सुत जायौ ॥\n(जैश्री) हित हरिवंश प्रपंच बंच सब, काल व्याल कौ खायौ ।\nयह जिय जानि श्याम-श्यामा पद, कमल-संगी सिर नायौ ॥59॥";

let idx58_59 = versesText.findIndex(v => v.number === 59);
if (idx58_59 !== -1) {
    versesText.splice(idx58_59, 1);
    let parts = fullVerse59.split('॥58॥');
    versesText.push({
        number: 58,
        text: parts[0].trim() + '॥58॥'
    });
    versesText.push({
        number: 59,
        text: parts[1].trim()
    });
}

versesText.sort((a,b) => a.number - b.number);

const numSections = 7;
for (let i = 0; i < numSections; i++) {
   let start = i * 12 + 1;
   let end = (i + 1) * 12;
   let sectionVerses = versesText.filter(v => v.number >= start && v.number <= end);
   
   sections.push({
      id: start + "-" + end,
      title: "Padas " + start + "-" + end,
      audioUrl: sectionAudio[i] || '',
      verses: sectionVerses
   });
}

let allNums = versesText.map(v => v.number);
for (let i=1; i<=84; i++) {
    if (!allNums.includes(i)) {
        console.log("Missing", i);
    }
}

const finalJs = "export const collections = [\n  {\n    id: 'hit-chaurasi-ji',\n    title: 'Shri Hit Chaurasi Ji',\n    subtitle: 'Verse-by-verse reader with audio and progress tracking',\n    description:\n      'A structured starting point for the Chaurasi Ji collection. More collections can be added later with the same format.',\n    totalVerses: 84,\n    estimatedAudioParts: 7,\n    audioHint: 'Audio is attached per section.',\n    sections: " + JSON.stringify(sections, null, 2) + "\n  }\n];";

fs.writeFileSync('app/content.js', finalJs);
console.log("Parsed " + versesText.length + " verses.");
console.log("Sections " + sections.length);
