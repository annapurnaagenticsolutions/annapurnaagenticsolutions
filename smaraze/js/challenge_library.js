/* Structured real-world transfer challenges. These record evidence of application,
 * never mastery, entitlement, or a grade. */
(function (global) {
  'use strict';
  var banks = {
    'Mathematics': [
      { id: 'water-tank', title: 'Plan a water-tank refill', scenario: 'A family tank holds 1,000 litres. It has 650 litres. A pump adds 25 litres each minute.', relevant: 'The target is 900 litres.', irrelevant: 'The tank is painted blue.', question: 'Which plan finds the time needed?', strategies: ['Find the missing litres, then divide by litres per minute.', 'Add the tank capacity to the current amount.', 'Multiply the target by the pump rate.'], correctStrategy: 0, answerPrompt: 'How many minutes will the pump run?', answer: '10', answerType: 'number', explanationPrompt: 'Explain the first calculation in your own words.' },
      { id: 'market-budget', title: 'Make a market estimate', scenario: 'A fruit seller charges ₹12 for one mango. You want 3 mangoes and have ₹50.', relevant: 'You need the total cost and change.', irrelevant: 'The basket is woven.', question: 'Which plan checks whether the budget is enough?', strategies: ['Multiply price by quantity, then compare with the budget.', 'Subtract the budget from the price of one mango.', 'Divide the quantity by the colour of the fruit.'], correctStrategy: 0, answerPrompt: 'How many rupees remain?', answer: '14', answerType: 'number', explanationPrompt: 'Explain why your multiplication comes before subtraction.' }
    ],
    'Physics': [
      { id: 'bicycle-ramp', title: 'Explain a bicycle on a ramp', scenario: 'A bicycle rolls down a ramp and then slows on flat ground.', relevant: 'The slope and surface change.', irrelevant: 'The rider’s shirt colour.', question: 'Which plan makes a useful explanation?', strategies: ['Compare the forces and surfaces before and after the slope.', 'Use the wheel colour as the main cause.', 'Assume speed never changes.'], correctStrategy: 0, answerPrompt: 'What changes when the bicycle reaches the flat ground?', answer: 'speed or motion changes', answerType: 'text', explanationPrompt: 'Name one observation that would support your explanation.' }
    ],
    'Chemistry': [
      { id: 'salt-water', title: 'Investigate salt dissolving', scenario: 'Two cups contain equal water. Salt is added to one cup and stirred.', relevant: 'The salt amount and stirring are observable variables.', irrelevant: 'The cup label font.', question: 'Which plan is a fair comparison?', strategies: ['Change one variable at a time and observe whether salt spreads through the water.', 'Change water, salt and temperature all at once.', 'Decide the result before observing.'], correctStrategy: 0, answerPrompt: 'What evidence would show the salt has dissolved?', answer: 'particles spread or no visible crystals', answerType: 'text', explanationPrompt: 'Explain why the cup label is not evidence.' }
    ],
    'Biology': [
      { id: 'plant-light', title: 'Compare plant growth', scenario: 'Two similar plants receive different amounts of light for one week.', relevant: 'Plant type, water, time and light can be recorded.', irrelevant: 'The pot sticker.', question: 'Which plan supports a fair conclusion?', strategies: ['Keep other conditions similar and compare a measured change.', 'Move both plants every hour and guess the result.', 'Measure only the pot colour.'], correctStrategy: 0, answerPrompt: 'What could you measure?', answer: 'height or number of leaves', answerType: 'text', explanationPrompt: 'Explain one condition that should stay the same.' }
    ],
    'Earth & Space': [
      { id: 'monsoon-data', title: 'Read a monsoon record', scenario: 'A weather table shows rainfall on five days and a drain fills after heavy rain.', relevant: 'Rainfall and drain level are recorded over time.', irrelevant: 'The notebook cover.', question: 'Which plan helps test a pattern?', strategies: ['Compare the dates and measurements, then describe a cautious pattern.', 'Claim that one rainy day proves every future day.', 'Ignore the measurements and use a slogan.'], correctStrategy: 0, answerPrompt: 'What would you compare first?', answer: 'rainfall and drain level by date', answerType: 'text', explanationPrompt: 'Use the word “evidence” in your explanation.' }
    ],
    'Computer Science & AI': [
      { id: 'qr-safety', title: 'Design a safer QR decision', scenario: 'A QR code opens a link. The device should check the destination before sharing information.', relevant: 'The algorithm can scan, inspect, warn, and ask for confirmation.', irrelevant: 'The phone case colour.', question: 'Which plan protects the user?', strategies: ['Inspect the destination and ask for confirmation before sending any private information.', 'Open every link and share the OTP automatically.', 'Skip all checks if the code looks colourful.'], correctStrategy: 0, answerPrompt: 'What should the algorithm do before private information is shared?', answer: 'inspect and confirm', answerType: 'text', explanationPrompt: 'Name one piece of information that should stay private.' }
    ]
  };
  function hash(value) { var total = 0, text = String(value || ''); for (var i = 0; i < text.length; i += 1) total = (total * 31 + text.charCodeAt(i)) >>> 0; return total; }
  function getChallenge(topic) {
    if (!topic) return null;
    var list = banks[topic.subject] || banks.Mathematics;
    var item = list[hash(topic.id) % list.length];
    return Object.assign({}, item, { challengeId: 'rw-' + item.id, topicId: topic.id });
  }
  global.AVYAAN_CHALLENGE_LIBRARY = banks;
  global.getRealWorldChallenge = getChallenge;
})(window);
