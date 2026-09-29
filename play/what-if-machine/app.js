const APP_VERSION = '1.3.0';
const STORAGE_KEY = 'whatIfMachine.gallery.v13';
const THEME_KEY = 'whatIfMachine.theme.v1';
const ONBOARDING_KEY = 'whatIfMachine.onboarding.v1';

const promptPacks = [
  {
    "id": "animals-in-charge",
    "title": "Animals in charge",
    "description": "Animals become officials, teachers, CEOs, traffic bosses, and city planners.",
    "prompts": [
      "What if crows ran Bengaluru traffic?",
      "What if goats became school inspectors?",
      "What if street dogs opened a bank?",
      "What if pigeons controlled airport announcements?",
      "What if cows reviewed restaurant menus?",
      "What if monkeys became apartment security guards?",
      "What if ants ran a logistics ministry?",
      "What if buffaloes became fitness influencers?",
      "What if squirrels ran the electricity board?",
      "What if parrots became news editors?"
    ]
  },
  {
    "id": "school-objects-talk",
    "title": "School objects talk",
    "description": "Bags, pencils, tiffins, benches, and blackboards finally complain back.",
    "prompts": [
      "What if your school bag could complain?",
      "What if pencils refused exams?",
      "What if the blackboard started giving attendance?",
      "What if lunch boxes formed a secret union?",
      "What if erasers started a memory-loss clinic?",
      "What if report cards started giving marks to teachers?",
      "What if school bells demanded work-life balance?",
      "What if homework diaries became detectives?",
      "What if sharpeners opened a career counselling desk?",
      "What if water bottles started giving exam tips?"
    ]
  },
  {
    "id": "food-society",
    "title": "Food society",
    "description": "Vegetables, snacks, and breakfast items create governments, startups, courts, and family drama.",
    "prompts": [
      "What if vegetables had elections?",
      "What if idlis started a startup?",
      "What if samosas ran a detective agency?",
      "What if laddus became gym trainers?",
      "What if pani puri opened a court of justice?",
      "What if dosas launched a space mission?",
      "What if biryani had a passport office?",
      "What if chutney became a celebrity manager?",
      "What if rotis held a round-table conference?",
      "What if mangoes opened a summer parliament?"
    ]
  },
  {
    "id": "weather-drama",
    "title": "Weather drama",
    "description": "Clouds, rain, wind, and sunshine behave like chaotic group members.",
    "prompts": [
      "What if monsoon clouds had WhatsApp groups?",
      "What if rain drops took attendance before falling?",
      "What if umbrellas went on strike?",
      "What if thunder became a motivational speaker?",
      "What if fog opened a mystery school?",
      "What if sunshine charged a subscription fee?",
      "What if rainbows started a colour consultancy?",
      "What if wind became a gossip reporter?",
      "What if clouds started performance appraisals?",
      "What if winter sweaters became climate advisors?"
    ]
  },
  {
    "id": "space-local",
    "title": "Space gets local",
    "description": "The moon, planets, stars, satellites, and aliens suddenly behave like local institutions.",
    "prompts": [
      "What if the moon opened a coaching center?",
      "What if Mars had a chai stall?",
      "What if satellites started gossiping?",
      "What if gravity took a holiday?",
      "What if stars started parent-teacher meetings?",
      "What if aliens came only to compare school marks?",
      "What if comets needed traffic permits?",
      "What if black holes opened storage lockers?",
      "What if the sun needed an alarm clock?",
      "What if planets opened a group tuition batch?"
    ]
  },
  {
    "id": "city-objects",
    "title": "City objects rebel",
    "description": "Traffic signals, lifts, chargers, dustbins, and roads develop opinions.",
    "prompts": [
      "What if traffic signals started giving life advice?",
      "What if elevators chose passengers by mood?",
      "What if phone chargers formed a missing persons bureau?",
      "What if dustbins started customer support?",
      "What if potholes opened a tourism department?",
      "What if metro cards became relationship counselors?",
      "What if parking cones started a discipline academy?",
      "What if speed breakers demanded respect?",
      "What if streetlights became night-shift supervisors?",
      "What if zebra crossings started checking confidence levels?"
    ]
  },
  {
    "id": "tiny-bureaucracy",
    "title": "Tiny bureaucracy",
    "description": "Absurd committees, forms, approvals, and emergency meetings for tiny problems.",
    "prompts": [
      "What if ants created a passport office?",
      "What if coconuts built a consulting firm?",
      "What if chalk pieces became motivational speakers?",
      "What if slippers required driving licenses?",
      "What if water bottles started issuing warnings?",
      "What if ceiling fans formed a review board?",
      "What if teaspoons needed appointment slots?",
      "What if cushions created a grievance portal?",
      "What if matchboxes required fire-safety PowerPoints?",
      "What if bookmarks created a reading approval board?"
    ]
  },
  {
    "id": "home-chaos",
    "title": "Home chaos",
    "description": "Everyday household items act like emotional professionals.",
    "prompts": [
      "What if remote controls hired bodyguards?",
      "What if curtains started weather forecasting?",
      "What if pressure cookers became news anchors?",
      "What if socks held a missing partner summit?",
      "What if fridge magnets started giving career advice?",
      "What if pillows demanded weekend overtime?",
      "What if buckets opened a rainwater bank?",
      "What if mirrors started annual appraisal meetings?",
      "What if washing machines became relationship therapists for socks?",
      "What if doorbells started background verification?"
    ]
  },
  {
    "id": "festival-chaos",
    "title": "Festival chaos",
    "description": "Festivals, decorations, sweets, queues, and relatives become miniature systems.",
    "prompts": [
      "What if Diwali diyas formed a power company?",
      "What if Holi colours started a diplomatic mission?",
      "What if festival sweets demanded quality reviews?",
      "What if puja flowers opened a complaint desk?",
      "What if wedding chairs started seat allocation?",
      "What if crackers attended a noise-control workshop?",
      "What if rangoli patterns held a design award?",
      "What if gift boxes started emotional blackmail?",
      "What if fairy lights created a startup for brightness?",
      "What if invitation cards started ranking guests by punctuality?"
    ]
  },
  {
    "id": "tiny-startups",
    "title": "Tiny startups",
    "description": "Absurd startup ideas run by snacks, animals, planets, and stationery.",
    "prompts": [
      "What if ants launched a logistics startup?",
      "What if coconuts built a consulting company?",
      "What if dust particles opened a cleaning app?",
      "What if bananas created a fitness wearable?",
      "What if notebooks ran a productivity platform?",
      "What if clouds sold subscription rain?",
      "What if slippers built a navigation app?",
      "What if pencils launched an exam-prep platform?",
      "What if mosquitoes launched a reminder app?",
      "What if paper clips built an office productivity SaaS?"
    ]
  },
  {
    "id": "india-daily-life",
    "title": "Indian daily life",
    "description": "Autos, tea stalls, tuition classes, apartments, trains, and monsoon days become absurd systems.",
    "prompts": [
      "What if autos had board meetings before accepting rides?",
      "What if tea stalls issued weather forecasts?",
      "What if apartment lifts started judging punctuality?",
      "What if tuition benches formed a ranking committee?",
      "What if railway announcements became poets?",
      "What if grocery bags demanded performance reviews?",
      "What if society gates hosted talent auditions?",
      "What if milk packets formed a morning union?",
      "What if chai cups became morning consultants?",
      "What if apartment notice boards started giving life updates?"
    ]
  },
  {
    "id": "micro-science",
    "title": "Silly science lab",
    "description": "Fake experiments, impossible observations, and harmless nonsense reports.",
    "prompts": [
      "What if gravity took a tea break?",
      "What if shadows demanded salaries?",
      "What if mirrors started giving honest feedback?",
      "What if magnets opened a friendship bureau?",
      "What if echoes filed noise complaints?",
      "What if time tables controlled actual time?",
      "What if soap bubbles became weather balloons?",
      "What if yawns were contagious Wi-Fi signals?",
      "What if pencils discovered the law of exam gravity?",
      "What if dust particles ran a visibility experiment?"
    ]
  },
  {
    "id": "classroom-absurdity",
    "title": "Classroom absurdity",
    "description": "School routines become comedy systems without mocking students or teachers.",
    "prompts": [
      "What if attendance registers took attendance of humans?",
      "What if the last bench became principal for one day?",
      "What if maths problems started negotiating marks?",
      "What if science diagrams escaped the notebook?",
      "What if exam halls played suspense music?",
      "What if library books started recommending students?",
      "What if school corridors had traffic police?",
      "What if project charts asked for presentation practice?",
      "What if answer sheets demanded better handwriting rights?",
      "What if school shoes started a punctuality podcast?"
    ]
  },
  {
    "id": "tech-gadgets",
    "title": "Tech and gadgets",
    "description": "Phones, apps, passwords, keyboards, and notifications behave like dramatic citizens.",
    "prompts": [
      "What if phone notifications formed a choir?",
      "What if passwords started interviewing users?",
      "What if keyboards refused spelling mistakes?",
      "What if Wi-Fi routers became mood readers?",
      "What if screenshots opened a memory museum?",
      "What if autocorrect became a strict English teacher?",
      "What if headphones started judging playlists?",
      "What if low battery alerts became life coaches?",
      "What if QR codes started asking personal questions?",
      "What if browser tabs formed a support group?"
    ]
  },
  {
    "id": "nature-parliament",
    "title": "Nature parliament",
    "description": "Trees, rivers, insects, flowers, and mountains hold harmless meetings and debates.",
    "prompts": [
      "What if trees held a parliament session?",
      "What if rivers started sending invoices?",
      "What if flowers opened a perfume court?",
      "What if mountains gave public speeches?",
      "What if bees started a productivity podcast?",
      "What if leaves filed seasonal transfer requests?",
      "What if rocks formed a patience club?",
      "What if coconuts held safety inspections?",
      "What if clouds and trees negotiated shade-sharing rules?",
      "What if flowers created a bee appointment system?"
    ]
  },
  {
    "id": "market-madness",
    "title": "Market madness",
    "description": "Markets, bargaining, street food, queues, bags, and bills become miniature dramas.",
    "prompts": [
      "What if shopping bags had bargaining skills?",
      "What if vegetable vendors used weather satellites?",
      "What if price tags became motivational speakers?",
      "What if queues elected a line leader?",
      "What if receipts started telling emotional stories?",
      "What if weighing scales became judges?",
      "What if street food carts issued loyalty certificates?",
      "What if coins started a nostalgia channel?",
      "What if bargain prices had mood swings?",
      "What if shopping carts started route optimization?"
    ]
  },
  {
    "id": "sports-playground",
    "title": "Sports and playground",
    "description": "Games, balls, bats, whistles, and playground objects create absurd tournaments.",
    "prompts": [
      "What if footballs selected their own teams?",
      "What if cricket bats demanded rest days?",
      "What if whistles became match commentators?",
      "What if playground slides ran a transport company?",
      "What if badminton shuttles held a flight school?",
      "What if scoreboards became motivational gurus?",
      "What if water breaks needed sponsorship deals?",
      "What if trophies became career counselors?",
      "What if boundary ropes became cricket analysts?",
      "What if skipping ropes opened a fitness academy?"
    ]
  },
  {
    "id": "exam-season-comedy",
    "title": "Exam season comedy",
    "description": "Exams, marks, revision plans, answer sheets, and study tables become harmless comedy systems.",
    "prompts": [
      "What if revision notes started motivational speeches?",
      "What if exam clocks slowed down for dramatic effect?",
      "What if answer sheets hired handwriting translators?",
      "What if calculators formed an ethics committee?",
      "What if marksheets started giving feedback to questions?",
      "What if study tables demanded silence from students?",
      "What if admit cards became security officers?",
      "What if sample papers opened a prediction market?",
      "What if exam invigilators were replaced by sleepy pillows?",
      "What if toppers' pens held a press conference?"
    ]
  },
  {
    "id": "transport-tales",
    "title": "Transport tales",
    "description": "Buses, autos, trains, signals, platforms, helmets, and tickets behave like tiny public systems.",
    "prompts": [
      "What if buses chose routes based on mood?",
      "What if auto meters started giving philosophy lessons?",
      "What if train tickets formed a travel club?",
      "What if helmets opened a safety coaching center?",
      "What if bus stops became gossip editors?",
      "What if metro doors started judging running skills?",
      "What if railway platforms held talent shows?",
      "What if seat belts started career counselling?",
      "What if scooters formed a monsoon support group?",
      "What if traffic cones became motivational speakers?"
    ]
  },
  {
    "id": "family-object-drama",
    "title": "Family object drama",
    "description": "Household items behave like dramatic relatives while staying clean, gentle, and family-safe.",
    "prompts": [
      "What if sofa cushions started family meetings?",
      "What if TV remotes became household celebrities?",
      "What if dining tables demanded better conversations?",
      "What if ceiling fans became emotional weather reporters?",
      "What if pressure cookers hosted breaking news?",
      "What if slippers opened a lost-and-found court?",
      "What if curtains started privacy negotiations?",
      "What if photo frames gave advice to visitors?",
      "What if refrigerators became secret keepers?",
      "What if lunch plates started appreciating chefs?"
    ]
  },
  {
    "id": "robots-and-ai-silly",
    "title": "Robots and AI silly",
    "description": "Robots, AI helpers, assistants, and smart devices misunderstand everyday life in funny, safe ways.",
    "prompts": [
      "What if robots joined a school annual day?",
      "What if an AI assistant became a tiffin planner?",
      "What if smart speakers started overacting?",
      "What if robot sweepers formed a dust detective squad?",
      "What if chatbots opened a chai shop?",
      "What if smart watches became strict grandparents?",
      "What if drones started delivering compliments?",
      "What if AI cameras became wildlife photographers for ants?",
      "What if robots tried to understand Indian weddings?",
      "What if a smart fridge launched a diet rebellion?"
    ]
  },
  {
    "id": "tiny-kingdoms",
    "title": "Tiny kingdoms",
    "description": "Harmless fantasy kingdoms for pencils, clouds, snacks, insects, and forgotten objects.",
    "prompts": [
      "What if a kingdom existed inside a pencil box?",
      "What if ants built a royal metro system?",
      "What if socks ruled two separate kingdoms?",
      "What if clouds elected a drizzle king?",
      "What if biscuits formed a crumb empire?",
      "What if paper boats had a navy academy?",
      "What if marbles became palace guards?",
      "What if buttons created a tiny fashion court?",
      "What if matchsticks opened a drama academy?",
      "What if soap bubbles became floating diplomats?"
    ]
  },
  {
    "id": "office-but-silly",
    "title": "Office but silly",
    "description": "Meetings, spreadsheets, badges, chairs, coffee machines, and calendars become low-risk workplace comedy.",
    "prompts": [
      "What if spreadsheets started refusing boring numbers?",
      "What if office chairs gave productivity reviews?",
      "What if coffee machines became project managers?",
      "What if meeting rooms demanded fewer meetings?",
      "What if ID cards started checking confidence?",
      "What if calendars formed a stress union?",
      "What if sticky notes opened a memory clinic?",
      "What if printers became drama queens?",
      "What if office plants started approving leave requests?",
      "What if laptops demanded snack breaks?"
    ]
  },
  {
    "id": "bedtime-absurdity",
    "title": "Bedtime absurdity",
    "description": "Gentler, cozy what-ifs for bedtime stories, younger children, and calm family entertainment.",
    "prompts": [
      "What if stars whispered bedtime reminders?",
      "What if pillows collected dreams like postcards?",
      "What if blankets opened a comfort school?",
      "What if night lamps became tiny moon assistants?",
      "What if yawns travelled by train?",
      "What if teddy bears ran a sleep committee?",
      "What if dreams needed tickets?",
      "What if moonlight painted quiet roads?",
      "What if beds became boats for sleepy islands?",
      "What if alarm clocks learned kindness?"
    ]
  },
  {
    "id": "eco-inventions",
    "title": "Eco inventions",
    "description": "Nature-friendly absurd ideas that can also become classroom prompts without pretending to be real science.",
    "prompts": [
      "What if dustbins gave points for cleanliness?",
      "What if trees sent thank-you notes for shade?",
      "What if rainwater tanks became town bankers?",
      "What if bicycles opened a clean-air club?",
      "What if old newspapers became historians?",
      "What if compost bins started cooking shows?",
      "What if reusable bags had superhero badges?",
      "What if lakes hired cleanliness ambassadors?",
      "What if solar panels became sun poets?",
      "What if gardens hosted recycling festivals?"
    ]
  },
  {
    "id": "travel-ticket-chaos",
    "title": "Travel and ticket chaos",
    "description": "Tickets, trains, buses, luggage, queues, and announcements create tiny travel comedies.",
    "prompts": [
      "What if train tickets started checking passengers?",
      "What if luggage bags opened a complaint desk?",
      "What if bus stops started giving career advice?",
      "What if railway platforms became talent judges?",
      "What if boarding passes started gossiping?",
      "What if seat numbers refused to stay in order?",
      "What if rickshaw meters became philosophers?",
      "What if travel pillows formed a sleep union?",
      "What if station clocks ran on chai time?",
      "What if GPS maps started giving sarcastic directions?",
      "What if toll gates hosted quiz competitions?",
      "What if suitcases demanded vacation photos?"
    ]
  },
  {
    "id": "library-book-worlds",
    "title": "Library and book worlds",
    "description": "Books, shelves, bookmarks, pages, and librarians become tiny fantasy systems.",
    "prompts": [
      "What if library books held secret night meetings?",
      "What if bookmarks started judging readers?",
      "What if pages escaped during exams?",
      "What if dictionaries became debate champions?",
      "What if novels opened a travel agency?",
      "What if library shelves started arranging humans?",
      "What if book covers demanded better acting roles?",
      "What if footnotes became breaking news anchors?",
      "What if index pages started giving life shortcuts?",
      "What if storybooks complained about spoilers?",
      "What if textbooks started a comedy club?",
      "What if library silence became a security guard?"
    ]
  },
  {
    "id": "village-small-town",
    "title": "Village and small-town comedy",
    "description": "Hand pumps, ponds, bicycles, banyan trees, tea corners, and local notice boards create gentle local absurdity.",
    "prompts": [
      "What if the village hand pump became mayor for a day?",
      "What if bicycles formed a traffic union?",
      "What if the banyan tree opened a counseling center?",
      "What if the pond started issuing weather permits?",
      "What if tea corner benches became news channels?",
      "What if street goats managed parking rules?",
      "What if notice boards started fact-checking gossip?",
      "What if kites delivered official letters?",
      "What if lanterns demanded night-shift allowance?",
      "What if clay pots became water ministers?",
      "What if village lanes started naming humans?",
      "What if market baskets held annual elections?"
    ]
  },
  {
    "id": "notification-drama",
    "title": "Notification drama",
    "description": "Apps, alerts, passwords, screenshots, groups, emojis, and battery warnings become emotional characters.",
    "prompts": [
      "What if notifications had a family group?",
      "What if passwords opened a memory clinic?",
      "What if emojis started a court case?",
      "What if screenshots became private detectives?",
      "What if phone batteries gave motivational speeches?",
      "What if Wi-Fi signals started charging rent?",
      "What if app updates needed emotional consent?",
      "What if autocorrect became a school teacher?",
      "What if voice notes formed a drama club?",
      "What if unread messages started a protest march?",
      "What if airplane mode opened a meditation retreat?",
      "What if chargers started a lost-and-found bureau?"
    ]
  },
  {
    "id": "tiny-courts-complaints",
    "title": "Tiny courts and complaints",
    "description": "Harmless everyday conflicts become courts, hearings, evidence files, and formal verdicts.",
    "prompts": [
      "What if socks took washing machines to court?",
      "What if umbrellas filed complaints against rain?",
      "What if spoons sued noisy plates?",
      "What if homework filed a case against weekends?",
      "What if slippers accused humans of disappearing them?",
      "What if pillows demanded justice for late sleeping?",
      "What if traffic cones held public hearings?",
      "What if lunch boxes sued boring vegetables?",
      "What if alarms appealed against the snooze button?",
      "What if dustbins judged snack wrappers?",
      "What if chalk dust opened an inquiry commission?",
      "What if ceiling fans investigated missing cool air?"
    ]
  },
  {
    "id": "reel-caption-sparks",
    "title": "Creator reel sparks",
    "description": "What-if ideas designed for short captions, reels, posters, hooks, and status updates.",
    "prompts": [
      "What if Monday had a customer care number?",
      "What if deadlines needed permission to enter the room?",
      "What if confidence came with a low-battery warning?",
      "What if coffee cups hosted morning interviews?",
      "What if meetings had trailer music?",
      "What if to-do lists started giving resignation letters?",
      "What if weekend plans hired bodyguards?",
      "What if chairs rated human productivity?",
      "What if calendars started hiding difficult days?",
      "What if lunch breaks became national festivals?",
      "What if office plants became HR managers?",
      "What if keyboards judged typing speed silently?"
    ]
  },
  {
    "id": "science-concepts-silly",
    "title": "Science concepts, silly edition",
    "description": "Gravity, friction, light, sound, magnets, energy, and circuits become playful characters without becoming incorrect lessons.",
    "prompts": [
      "What if friction started charging service tax?",
      "What if light rays needed road maps?",
      "What if sound waves started a podcast?",
      "What if magnets ran a friendship bureau?",
      "What if circuits held a family meeting?",
      "What if evaporation opened a disappearing academy?",
      "What if photosynthesis started a restaurant?",
      "What if atoms formed apartment societies?",
      "What if electricity had traffic rules?",
      "What if shadows took a holiday?",
      "What if pulleys opened a lifting consultancy?",
      "What if thermometers became mood readers?"
    ]
  },
  {
    "id": "career-office-satire-lite",
    "title": "Office satire, clean edition",
    "description": "Meetings, slides, emails, chairs, coffee, and office plants become absurd but safe workplace comedy.",
    "prompts": [
      "What if PowerPoint slides started refusing bullet points?",
      "What if office chairs demanded promotion letters?",
      "What if emails formed a traffic jam?",
      "What if coffee machines became project managers?",
      "What if sticky notes opened a strategy firm?",
      "What if keyboards started annual performance reviews?",
      "What if spreadsheets hired emotional support cells?",
      "What if meeting rooms charged entry fees?",
      "What if office plants became silent auditors?",
      "What if status reports started writing poetry?",
      "What if calendars blocked time for daydreaming?",
      "What if headphones opened a peace committee?"
    ]
  },
  {
    "id": "bedtime-gentle-absurdity",
    "title": "Bedtime gentle absurdity",
    "description": "Soft, child-friendly what-ifs for calm stories, tiny quests, and non-scary night imagination.",
    "prompts": [
      "What if stars took attendance before bedtime?",
      "What if pillows guarded dreams like tiny soldiers?",
      "What if blankets became cloud boats?",
      "What if the moon told very short jokes?",
      "What if sleepy socks walked to dream school?",
      "What if night lamps opened a comfort shop?",
      "What if teddy bears had a whisper parliament?",
      "What if bedtime stories chose their own endings?",
      "What if yawns became tiny butterflies?",
      "What if dreams had a lost-and-found counter?",
      "What if alarm clocks went to sleep early?",
      "What if slippers guided children to dreamland?"
    ]
  },
  {
    "id": "parent-family-sparks",
    "title": "Family-friendly sparks",
    "description": "Safe prompts for parents, children, siblings, grandparents, and family storytelling sessions.",
    "prompts": [
      "What if the dining table hosted family debates?",
      "What if TV remotes created a peace treaty?",
      "What if grandparents' glasses became detectives?",
      "What if family photo frames started giving advice?",
      "What if the doorbell became a guest manager?",
      "What if dinner plates voted on the menu?",
      "What if shoe racks arranged family meetings?",
      "What if cushions became secret keepers?",
      "What if water filters gave health lectures?",
      "What if curtains chose the weather mood?",
      "What if the clock started asking everyone to slow down?",
      "What if house keys opened only funny stories?"
    ]
  },
  {
    "id": "visual-poster-prompts",
    "title": "Visual poster prompts",
    "description": "Prompts selected because they naturally create strong poster/comic imagery.",
    "prompts": [
      "What if a samosa wore a superhero cape?",
      "What if a traffic signal became a school principal?",
      "What if the moon sold coaching notes from a balcony?",
      "What if a cloud carried an umbrella?",
      "What if a pencil led an exam protest with a tiny flag?",
      "What if an idli launched from a space center?",
      "What if a crow wore a traffic police cap?",
      "What if a slipper opened a navigation desk?",
      "What if a book shelf became a railway station?",
      "What if a tea cup became a morning news anchor?",
      "What if a mosquito started a reminder app?",
      "What if a lunch box became a judge?"
    ]
  },
  {
    "id": "mythical-modern",
    "title": "Mythical but modern",
    "description": "Harmless myth-like creatures dealing with modern offices, schools, apps, and queues.",
    "prompts": [
      "What if a tiny dragon became a school bus conductor?",
      "What if a friendly giant opened a photocopy shop?",
      "What if a mermaid joined an online tuition class?",
      "What if a wizard became society maintenance manager?",
      "What if a talking tree ran a mobile recharge counter?",
      "What if a fairy started a lost-and-found department?",
      "What if a mountain spirit had to update its address proof?",
      "What if a magic carpet needed parking permission?",
      "What if a sleepy dragon worked as a library assistant?",
      "What if a cloud fairy became a rainwater consultant?",
      "What if a tiny genie opened a customer support desk?",
      "What if a unicorn had to pass a traffic test?"
    ]
  },
  {
    "id": "history-but-silly",
    "title": "History but silly",
    "description": "Non-political, classroom-safe historical imagination using objects, museums, maps, and old inventions.",
    "prompts": [
      "What if ancient maps started giving live traffic updates?",
      "What if museum statues formed a night committee?",
      "What if old coins opened a nostalgia bank?",
      "What if cave paintings became social media influencers?",
      "What if sundials complained about smartphones?",
      "What if ancient scrolls started sending notifications?",
      "What if old forts started hosting orientation sessions?",
      "What if clay pots created a storage startup?",
      "What if quills refused to write boring homework?",
      "What if fossils started a memory club?",
      "What if old calendars predicted exam holidays?",
      "What if history textbooks interviewed their own chapters?"
    ]
  },
  {
    "id": "maths-but-masti",
    "title": "Maths but masti",
    "description": "Numbers, shapes, graphs, and equations become characters without making learning stressful.",
    "prompts": [
      "What if zero became the class monitor?",
      "What if triangles opened a security agency?",
      "What if fractions started a sharing consultancy?",
      "What if multiplication tables formed a choir?",
      "What if graphs became weather reporters?",
      "What if circles demanded corner rights?",
      "What if rulers started measuring confidence?",
      "What if decimals opened a tiny bank?",
      "What if equations started negotiating both sides?",
      "What if angles hosted a dance competition?",
      "What if percentages became discount detectives?",
      "What if geometry boxes became city planners?"
    ]
  },
  {
    "id": "festival-family",
    "title": "Festival family comedy",
    "description": "Gentle family-safe festival chaos around food, decoration, relatives, and preparation.",
    "prompts": [
      "What if diyas held a brightness competition?",
      "What if ladoos audited festival happiness?",
      "What if garlands started seating arrangements?",
      "What if gift wrappers became secret agents?",
      "What if festival shoes formed a lost-and-found union?",
      "What if rangoli colors opened a design school?",
      "What if sweet boxes started ranking compliments?",
      "What if invitation cards gave punctuality scores?",
      "What if festival drums became announcement managers?",
      "What if new clothes demanded a launch ceremony?",
      "What if house decorations held a review meeting?",
      "What if relatives' tea cups started recording gossip?"
    ]
  },
  {
    "id": "kids-bedroom-worlds",
    "title": "Kids bedroom worlds",
    "description": "Gentle bedtime and room-object imagination with pillows, toys, lamps, and blankets.",
    "prompts": [
      "What if pillows opened a dream cinema?",
      "What if blankets became night security guards?",
      "What if toys held a midnight assembly?",
      "What if bedside lamps told tiny jokes?",
      "What if storybooks chose their own readers?",
      "What if teddy bears ran a kindness school?",
      "What if alarm clocks became sleep coaches?",
      "What if crayons painted secret maps at night?",
      "What if socks created a rescue mission?",
      "What if curtains negotiated with moonlight?",
      "What if toy cars opened a traffic school?",
      "What if wardrobes hosted costume elections?"
    ]
  },
  {
    "id": "public-transport-comedy",
    "title": "Public transport comedy",
    "description": "Buses, trains, tickets, queues, seats, and announcements become playful characters.",
    "prompts": [
      "What if bus tickets became travel reviewers?",
      "What if train seats started reservation interviews?",
      "What if metro announcements became poets?",
      "What if luggage bags demanded passenger ratings?",
      "What if platform numbers played hide and seek?",
      "What if bus conductors had cloud-based whistles?",
      "What if railway clocks became suspense directors?",
      "What if auto meters gave life lessons?",
      "What if boarding passes started checking confidence?",
      "What if traffic cones hosted a transport summit?",
      "What if seat belts became motivational speakers?",
      "What if travel pillows opened a comfort consultancy?"
    ]
  },
  {
    "id": "creator-trend-sparks",
    "title": "Creator trend sparks",
    "description": "Short-form friendly absurd prompts for reels, statuses, thumbnails, and carousel posts.",
    "prompts": [
      "What if notifications had a family group?",
      "What if captions started rejecting boring posts?",
      "What if hashtags opened a coaching class?",
      "What if thumbnails formed a drama club?",
      "What if reels had traffic police?",
      "What if comments hired emotional translators?",
      "What if profile pictures ran a confidence workshop?",
      "What if likes demanded annual leave?",
      "What if shares became gossip pigeons?",
      "What if filters became fashion consultants?",
      "What if drafts escaped and posted themselves?",
      "What if mute buttons started a peace movement?"
    ]
  },
  {
    "id": "language-mix-play",
    "title": "Language mix play",
    "description": "Prompts designed for English, Simple English, Hinglish, and translation-friendly variants.",
    "prompts": [
      "What if English words and Hindi words shared a tiffin?",
      "What if Hinglish opened a translation cafe?",
      "What if commas became conversation police?",
      "What if emojis became language teachers?",
      "What if dictionaries started telling jokes?",
      "What if subtitles had stage fright?",
      "What if spellcheck moved to a village school?",
      "What if full stops demanded dramatic endings?",
      "What if question marks became detectives?",
      "What if vowels formed a singing group?",
      "What if grammar books started a comedy club?",
      "What if voice notes needed subtitles for themselves?"
    ]
  },
  {
    "id": "eco-friendly-absurdity",
    "title": "Eco-friendly absurdity",
    "description": "Safe climate/nature imagination without fear: reuse, water, trees, and clean habits made funny.",
    "prompts": [
      "What if dustbins gave recycling report cards?",
      "What if trees started a shade subscription?",
      "What if water bottles opened a refill movement?",
      "What if bicycles became city ambassadors?",
      "What if solar panels started sun negotiations?",
      "What if compost bins became kitchen scientists?",
      "What if leaves organized a cleanliness parade?",
      "What if rainwater tanks became cloud accountants?",
      "What if paper bags opened a respect campaign?",
      "What if garden worms became soil engineers?",
      "What if reusable boxes had loyalty points?",
      "What if streetlights asked for energy-saving holidays?"
    ]
  },
  {
    "id": "tiny-professions",
    "title": "Tiny professions",
    "description": "Objects and animals take harmless professional roles: auditor, coach, reporter, guide, inspector.",
    "prompts": [
      "What if teaspoons became quality auditors?",
      "What if slippers became navigation coaches?",
      "What if erasers became memory consultants?",
      "What if pigeons became city reporters?",
      "What if cushions became comfort inspectors?",
      "What if ceiling fans became weather analysts?",
      "What if umbrellas became risk managers?",
      "What if bookmarks became reading coaches?",
      "What if lunch boxes became nutrition anchors?",
      "What if dusters became classroom historians?",
      "What if staplers became office therapists?",
      "What if paper clips became teamwork trainers?"
    ]
  },
  {
    "id": "mini-mystery-cases",
    "title": "Mini mystery cases",
    "description": "Harmless detective prompts with clues, witnesses, and funny reveals.",
    "prompts": [
      "What if the missing homework was hiding in the lunch box?",
      "What if the last samosa left a clue?",
      "What if the umbrella knew who moved the shoes?",
      "What if the classroom clock solved a mystery?",
      "What if the tea cup witnessed a biscuit robbery?",
      "What if the library shelf found a secret note?",
      "What if the metro card exposed a travel mystery?",
      "What if the remote control ran away with evidence?",
      "What if the school bell knew the real timetable?",
      "What if the balcony plant saw everything?",
      "What if the pencil box became a detective bureau?",
      "What if the missing charger left dramatic footprints?"
    ]
  },
  {
    "id": "sports-commentary-absurd",
    "title": "Sports commentary absurdity",
    "description": "Playground events narrated like major tournaments while staying silly and safe.",
    "prompts": [
      "What if marbles had a world cup?",
      "What if cricket stumps started reviewing decisions?",
      "What if badminton nets gave tactical advice?",
      "What if whistles became celebrity commentators?",
      "What if water bottles managed team strategy?",
      "What if football boots demanded sponsorship deals?",
      "What if chess pieces hosted a press conference?",
      "What if carrom coins opened a training academy?",
      "What if skipping ropes became fitness judges?",
      "What if playground dust became match referee?",
      "What if scoreboards started motivating losing teams?",
      "What if trophies gave career guidance?"
    ]
  },
  {
    "id": "poster-first-hooks",
    "title": "Poster-first hooks",
    "description": "Inputs optimized for vertical posters, thumbnails, and one-line punchlines.",
    "prompts": [
      "What if the moon charged tuition fees?",
      "What if potholes became tourist attractions?",
      "What if clouds muted the rain group?",
      "What if pencils resigned before exams?",
      "What if onions won by emotional campaigning?",
      "What if alarm clocks needed motivation?",
      "What if traffic signals gave therapy?",
      "What if chai cups became morning CEOs?",
      "What if bananas launched a gym app?",
      "What if shoes checked attendance?",
      "What if passwords forgot humans?",
      "What if shadows demanded credit?"
    ]
  },
  {
    "id": "super-short-status",
    "title": "Super-short status prompts",
    "description": "Ultra-compact what-ifs designed for status posts, quick jokes, and rapid replay.",
    "prompts": [
      "What if mirrors charged honesty tax?",
      "What if tea spoons had ambition?",
      "What if windows opened opinions?",
      "What if sandals hated meetings?",
      "What if snacks took attendance?",
      "What if rain had a manager?",
      "What if buses kept secrets?",
      "What if notebooks felt pressure?",
      "What if coins missed pockets?",
      "What if laddus gave gym advice?",
      "What if batteries needed holidays?",
      "What if stars sold night tickets?"
    ]
  },
  {
    "id": "best-share-card-sparks",
    "title": "Best share-card sparks",
    "description": "Short, poster-friendly what-ifs designed for instant sharing.",
    "prompts": [
      "What if slippers had GPS tracking?",
      "What if chai cups reviewed mornings?",
      "What if school bells asked for overtime?",
      "What if potholes had tourist guides?",
      "What if shadows formed a dance team?",
      "What if umbrellas became weather influencers?",
      "What if dustbins gave civic lectures?",
      "What if lunch boxes had secret ratings?",
      "What if lift buttons voted on passengers?",
      "What if pillows wrote sleep reports?",
      "What if Wi-Fi signals had mood swings?",
      "What if notebooks leaked exam gossip?"
    ]
  },
  {
    "id": "serial-absurd-worlds",
    "title": "Serial absurd worlds",
    "description": "Prompts that can become recurring episode universes.",
    "prompts": [
      "What if the last bench ran a secret kingdom?",
      "What if a tea stall became the city parliament?",
      "What if a pencil detective solved school mysteries?",
      "What if clouds ran a rain subscription service?",
      "What if bus tickets opened a travel court?",
      "What if vegetables built a weekly cabinet?",
      "What if a ceiling fan became a weather god?",
      "What if phone chargers formed a rescue squad?",
      "What if the moon hosted parent-teacher meetings?",
      "What if a village notice board became a news channel?",
      "What if tiffin boxes ran a food federation?",
      "What if railway platforms had celebrity gossip columns?"
    ]
  },
  {
    "id": "classroom-warmup-bank",
    "title": "Classroom warmup bank",
    "description": "Safe prompts for discussion, vocabulary, drawing, and creative writing.",
    "prompts": [
      "What if fractions opened a pizza shop?",
      "What if verbs went on strike?",
      "What if maps refused to show shortcuts?",
      "What if plants held morning assembly?",
      "What if magnets became friendship coaches?",
      "What if water cycles had travel diaries?",
      "What if multiplication tables formed a band?",
      "What if punctuation marks started a court case?",
      "What if planets created seating arrangements?",
      "What if the periodic table hosted a talent show?",
      "What if history dates complained about memorization?",
      "What if triangles ran a construction company?"
    ]
  },
  {
    "id": "family-dinner-absurdity",
    "title": "Family dinner absurdity",
    "description": "Gentle, family-safe comedy around home, food, and daily routines.",
    "prompts": [
      "What if dinner plates gave feedback?",
      "What if the remote control chose the family leader?",
      "What if the fridge held a midnight meeting?",
      "What if curtains started giving privacy advice?",
      "What if pressure cookers hosted a news debate?",
      "What if spoons ran a kitchen election?",
      "What if socks wrote missing-person reports?",
      "What if balcony plants became neighbors?",
      "What if door mats judged visitors politely?",
      "What if water filters became health coaches?",
      "What if fans complained about summer workload?",
      "What if bedsheets started a comfort committee?"
    ]
  },
  {
    "id": "creator-reel-hooks",
    "title": "Creator reel hooks",
    "description": "Absurd ideas optimized for reels, shorts, captions, and status posts.",
    "prompts": [
      "What if notifications had a complaint department?",
      "What if reels started judging humans?",
      "What if hashtags formed a union?",
      "What if emojis gave performance reviews?",
      "What if selfies attended confidence training?",
      "What if captions refused to be relatable?",
      "What if comment sections had traffic police?",
      "What if trending sounds demanded royalties?",
      "What if filters told the truth politely?",
      "What if group chats elected a prime admin?",
      "What if status updates had expiry interviews?",
      "What if memes opened a coaching class?"
    ]
  },
  {
    "id": "poster-headline-bank",
    "title": "Poster headline bank",
    "description": "High-contrast what-ifs that produce clean visual posters.",
    "prompts": [
      "What if the moon sold night tickets?",
      "What if rain had a customer-care number?",
      "What if roads took revenge on bad parking?",
      "What if trees issued oxygen invoices?",
      "What if stars needed attendance cards?",
      "What if shoes had annual appraisals?",
      "What if traffic cones became life coaches?",
      "What if calculators hid during exams?",
      "What if clouds wore office ID cards?",
      "What if alarm clocks needed motivation?",
      "What if notebooks became memory banks?",
      "What if tea kettles ran crisis meetings?"
    ]
  },
  {
    "id": "language-practice-sparks",
    "title": "Language practice sparks",
    "description": "Simple prompts that are easy to convert into Hinglish, Hindi-friendly, and Odia-friendly versions.",
    "prompts": [
      "What if mangoes opened a school?",
      "What if a bus became a storyteller?",
      "What if rain wrote letters?",
      "What if a kite gave flying lessons?",
      "What if a river learned singing?",
      "What if a bicycle became a teacher?",
      "What if a lamp told bedtime jokes?",
      "What if a tree kept a diary?",
      "What if a spoon became a hero?",
      "What if a shoe lost its twin?",
      "What if a book became a friend?",
      "What if a small cloud wanted a big job?"
    ]
  },
  {
    "id": "friendly-science-whatifs",
    "title": "Friendly science what-ifs",
    "description": "Science-adjacent absurdity without fake claims or unsafe advice.",
    "prompts": [
      "What if gravity asked for weekly leave?",
      "What if sound waves became gossip carriers?",
      "What if light rays used traffic signals?",
      "What if electricity attended safety training?",
      "What if magnets opened a match-making desk?",
      "What if shadows needed permission slips?",
      "What if echoes took repeat exams?",
      "What if plants negotiated sunlight timings?",
      "What if clouds filed evaporation reports?",
      "What if friction started a complaint cell?",
      "What if thermometers became weather poets?",
      "What if batteries held energy budgets?"
    ]
  },
  {
    "id": "small-town-serials",
    "title": "Small-town serials",
    "description": "Local, warm, recurring comedy around notice boards, buses, markets, and festivals.",
    "prompts": [
      "What if the weekly market had a mayor?",
      "What if a village bus became a radio host?",
      "What if the temple bell started scheduling meetings?",
      "What if the water pump gave speeches?",
      "What if the post office delivered dreams?",
      "What if the town clock ran late on purpose?",
      "What if shop shutters held night meetings?",
      "What if the school veranda became a court?",
      "What if goats managed traffic near the market?",
      "What if the barber shop became a news studio?",
      "What if kites governed the festival sky?",
      "What if benches reserved people instead of seats?"
    ]
  },
  {
    "id": "bengaluru-specific-sparks",
    "title": "Bengaluru specific sparks",
    "description": "Local prompts around traffic, cafes, tech parks, rain, and apartments.",
    "prompts": [
      "What if Silk Board signal became a philosopher?",
      "What if filter coffee ran a productivity seminar?",
      "What if office shuttles had emotional support groups?",
      "What if apartment gates became startup founders?",
      "What if rain clouds joined a tech sprint?",
      "What if potholes held a hackathon?",
      "What if metro tokens became city guides?",
      "What if traffic apps started telling bedtime stories?",
      "What if Koramangala cafes had secret councils?",
      "What if Whitefield signals demanded work from home?",
      "What if delivery bags became weather experts?",
      "What if auto meters became motivational speakers?"
    ]
  },
  {
    "id": "gentle-bedtime-absurdity-plus",
    "title": "Gentle bedtime absurdity plus",
    "description": "Soft, low-noise prompts suitable for children and family storytelling.",
    "prompts": [
      "What if the moon tucked clouds into bed?",
      "What if pillows guarded dreams?",
      "What if stars counted sleepy children?",
      "What if blankets had tiny libraries?",
      "What if night lamps whispered stories?",
      "What if teddy bears ran a dream school?",
      "What if yawns rode bicycles?",
      "What if slippers parked themselves quietly?",
      "What if curtains became sleep musicians?",
      "What if the fan sang a slow lullaby?",
      "What if books closed themselves politely?",
      "What if dreams wrote postcards home?"
    ]
  },
  {
    "id": "festival-shareables-plus",
    "title": "Festival shareables plus",
    "description": "Festival comedy designed for social sharing without religious mockery.",
    "prompts": [
      "What if fairy lights had performance targets?",
      "What if sweets gave guest ratings?",
      "What if rangoli colors opened a design studio?",
      "What if gift wrappers became detectives?",
      "What if wedding chairs negotiated seat plans?",
      "What if invitation cards had attendance trackers?",
      "What if balloons joined event management?",
      "What if flower garlands became fashion critics?",
      "What if festival queues had commentators?",
      "What if shopping lists became project managers?",
      "What if family photos elected a pose captain?",
      "What if festive discounts started giving interviews?"
    ]
  },
  {
    "id": "sports-playground-worlds",
    "title": "Sports playground worlds",
    "description": "Playground, cricket, games, and sports objects with clean absurdity.",
    "prompts": [
      "What if cricket balls gave match analysis?",
      "What if goalposts became referees?",
      "What if skipping ropes opened a fitness academy?",
      "What if chess pieces formed a family drama?",
      "What if carrom coins ran a bank?",
      "What if whistles demanded silence?",
      "What if playground slides became travel agents?",
      "What if scoreboards started poetry?",
      "What if badminton shuttlecocks had passports?",
      "What if footballs chose teams by kindness?",
      "What if medals held motivational talks?",
      "What if water breaks became official festivals?"
    ]
  },
  {
    "id": "office-safe-satire-plus",
    "title": "Office safe satire plus",
    "description": "Clean workplace absurdity without targeting real people or companies.",
    "prompts": [
      "What if calendars rejected unnecessary meetings?",
      "What if keyboards demanded typing breaks?",
      "What if coffee mugs became managers?",
      "What if spreadsheets started emotional counselling?",
      "What if chairs reviewed posture discipline?",
      "What if printers needed appreciation emails?",
      "What if ID cards formed a security union?",
      "What if meeting rooms hid during peak hours?",
      "What if office plants became HR advisors?",
      "What if sticky notes held strategy sessions?",
      "What if headphones filed noise complaints?",
      "What if laptops asked for holiday leave?"
    ]
  },
  {
    "id": "mystery-case-bank",
    "title": "Mystery case bank",
    "description": "Silly mysteries that produce detective-style tiny stories.",
    "prompts": [
      "What if the missing chalk became a celebrity?",
      "What if the last samosa vanished from the plate?",
      "What if the umbrella thief was a cloud?",
      "What if the school bell rang five minutes early?",
      "What if the fridge light knew a secret?",
      "What if the homework diary disappeared before Monday?",
      "What if the traffic cone moved by itself?",
      "What if the moon lost its attendance register?",
      "What if the market scale started lying politely?",
      "What if the classroom map changed overnight?",
      "What if the garden gnome solved neighborhood cases?",
      "What if the lost sock sent clues?"
    ]
  },
  {
    "id": "future-but-silly",
    "title": "Future but silly",
    "description": "Friendly future, robots, gadgets, and AI prompts with harmless comedy.",
    "prompts": [
      "What if robots opened a manners school?",
      "What if AI assistants needed chai breaks?",
      "What if smart fridges became diet philosophers?",
      "What if drones delivered excuses instead of parcels?",
      "What if calendars predicted mood swings?",
      "What if smartwatches gave gossip alerts?",
      "What if vacuum robots formed a cleaning orchestra?",
      "What if keyboards auto-corrected emotions?",
      "What if traffic lights used artificial patience?",
      "What if holograms attended tuition classes?",
      "What if robots learned bargaining at the market?",
      "What if smart homes held family meetings?"
    ]
  },
  {
    "id": "eco-humor-deep",
    "title": "Eco humor deep",
    "description": "Nature and sustainability prompts that stay positive and action-friendly.",
    "prompts": [
      "What if trees hosted oxygen appreciation day?",
      "What if dustbins gave recycling awards?",
      "What if rainwater tanks became savings banks?",
      "What if solar panels ran a sunshine club?",
      "What if bicycles became city ambassadors?",
      "What if rivers wrote clean-up invitations?",
      "What if leaves started a compost cafe?",
      "What if sparrows became balcony inspectors?",
      "What if gardens opened a kindness office?",
      "What if plastic bags attended responsibility school?",
      "What if clouds reviewed water usage?",
      "What if streetlights learned energy saving jokes?"
    ]
  },
  {
    "id": "mini-business-absurdity",
    "title": "Mini business absurdity",
    "description": "Playful non-serious business pitches for absurd objects and animals.",
    "prompts": [
      "What if coconuts launched a consulting firm?",
      "What if slippers built a navigation startup?",
      "What if ants opened a same-day delivery company?",
      "What if pencils sold exam confidence plans?",
      "What if clouds created rain-as-a-service?",
      "What if tea cups launched morning analytics?",
      "What if dust particles sold visibility reports?",
      "What if laddus built a fitness brand?",
      "What if bookmarks opened a reading SaaS?",
      "What if umbrellas sold monsoon insurance?",
      "What if chairs launched posture coaching?",
      "What if autos opened a ride-acceptance academy?"
    ]
  },
  {
    "id": "micro-drama-dialogues",
    "title": "Micro drama dialogues",
    "description": "Prompts designed to generate strong character quotes and short scenes.",
    "prompts": [
      "What if the spoon accused the fork?",
      "What if the traffic signal lost patience?",
      "What if the exam paper gave a speech?",
      "What if the umbrella refused one more rain?",
      "What if the pillow confronted the alarm clock?",
      "What if the tiffin scolded the chips packet?",
      "What if the charging cable gave a farewell note?",
      "What if the bus stop asked why everyone was late?",
      "What if the school bag demanded respect?",
      "What if the fan debated the summer heat?",
      "What if the moon complained to the sun?",
      "What if the chalk objected to being underestimated?"
    ]
  },
  {
    "id": "one-line-status-bank",
    "title": "One-line status bank",
    "description": "Compact prompts for quick status, caption, and WhatsApp sharing.",
    "prompts": [
      "What if Monday had a customer-care number?",
      "What if naps issued certificates?",
      "What if chai solved traffic?",
      "What if homework had feelings?",
      "What if rain had office timing?",
      "What if snacks ran meetings?",
      "What if clouds muted humans?",
      "What if Wi-Fi judged productivity?",
      "What if slippers took attendance?",
      "What if traffic lights needed therapy?",
      "What if notebooks kept secrets?",
      "What if idlis became influencers?"
    ]
  },
  {
    "id": "best-share-card-seeds",
    "title": "Best share card seeds",
    "description": "High-impact prompts designed for short poster cards, WhatsApp jokes, and quick social sharing.",
    "prompts": [
      "What if Monday had a resignation letter?",
      "What if chai became the prime minister of mornings?",
      "What if traffic jams started charging rent?",
      "What if umbrellas demanded monsoon allowance?",
      "What if Wi-Fi gave performance feedback?",
      "What if snacks held emergency meetings?",
      "What if alarm clocks needed counselling?",
      "What if slippers started GPS tracking humans?",
      "What if lunch breaks became national festivals?",
      "What if pillows issued sleep certificates?",
      "What if clouds sold premium drizzle plans?",
      "What if dustbins reviewed human discipline?"
    ]
  },
  {
    "id": "family-table-fun",
    "title": "Family table fun",
    "description": "Clean prompts for parents, children, and family dinner-time imagination games.",
    "prompts": [
      "What if the dining table could announce family news?",
      "What if chapatis told bedtime stories?",
      "What if the TV remote chose the most patient person?",
      "What if the water filter became a wise uncle?",
      "What if the sofa kept attendance of lazy Sundays?",
      "What if the pressure cooker hosted a talent show?",
      "What if the fridge formed a midnight snack police?",
      "What if the shoe rack started judging punctuality?",
      "What if the ceiling fan became family referee?",
      "What if the rice cooker gave motivational speeches?",
      "What if the balcony plants hosted morning meetings?",
      "What if the door mat started rating guests?"
    ]
  },
  {
    "id": "morning-assembly-warmups",
    "title": "Morning assembly warmups",
    "description": "School-safe prompts for quick speaking, creative writing, and classroom warm-up activities.",
    "prompts": [
      "What if the school bell had to give a speech?",
      "What if the attendance register became class monitor?",
      "What if the timetable swapped Monday with Sunday?",
      "What if the library books held an assembly?",
      "What if the science lab created a tiny cloud?",
      "What if the school bus started giving geography quizzes?",
      "What if the playground elected a captain from the footballs?",
      "What if the pencil box opened a lost-and-found court?",
      "What if the notice board started asking questions?",
      "What if the blackboard wrote back politely?",
      "What if the exam paper requested feedback?",
      "What if the water bottle became sports coach?"
    ]
  },
  {
    "id": "micro-comic-hooks",
    "title": "Micro comic hooks",
    "description": "Prompts with immediate visual contrast for tiny comic scenes and panel-based stories.",
    "prompts": [
      "What if an auto argued with a traffic signal?",
      "What if a pencil interviewed an eraser?",
      "What if a samosa chased a fitness trainer?",
      "What if the moon wore exam spectacles?",
      "What if a cloud entered a tea shop?",
      "What if a book complained to a bookmark?",
      "What if a dustbin gave a cleanliness lecture?",
      "What if a sock searched for its missing partner?",
      "What if a phone charger became a detective?",
      "What if a spoon accused the bowl of laziness?",
      "What if a traffic cone opened a discipline school?",
      "What if a mosquito attended a manners class?"
    ]
  },
  {
    "id": "poster-hook-bank",
    "title": "Poster hook bank",
    "description": "Short, punchy prompts that can become vertical poster cards without needing long explanation.",
    "prompts": [
      "What if gravity took casual leave?",
      "What if rain had office timing?",
      "What if homework sent reminders?",
      "What if stars needed electricity bills?",
      "What if laddus joined the gym?",
      "What if idlis became influencers?",
      "What if bags demanded weekly offs?",
      "What if traffic lights became philosophers?",
      "What if clouds created status updates?",
      "What if benches charged sitting fees?",
      "What if doors asked security questions?",
      "What if mirrors gave annual appraisals?"
    ]
  },
  {
    "id": "series-seed-worlds",
    "title": "Series seed worlds",
    "description": "Prompts designed for recurring characters, running jokes, episode arcs, and serial absurd worlds.",
    "prompts": [
      "What if a tiny council of pencils ran a school city?",
      "What if monsoon clouds formed a drama club?",
      "What if vegetables built their own parliament of snacks?",
      "What if metro stations became personality types?",
      "What if planets opened a tuition chain?",
      "What if apartment objects formed a secret society?",
      "What if traffic signals started a detective bureau?",
      "What if school bags created a backpack kingdom?",
      "What if kitchen utensils started a daily newspaper?",
      "What if library books created a night-time city?",
      "What if pillows ran a dream management office?",
      "What if garden insects built a miniature republic?"
    ]
  },
  {
    "id": "language-practice-sparks",
    "title": "Language practice sparks",
    "description": "Simple prompts that can be rewritten in English, Hinglish, Hindi-friendly English, or Odia-friendly English.",
    "prompts": [
      "What if rain drops learned polite greetings?",
      "What if the moon asked for directions?",
      "What if a mango wrote a postcard?",
      "What if a crow opened a help desk?",
      "What if a school bag said sorry?",
      "What if an umbrella thanked the clouds?",
      "What if a train ticket told its journey?",
      "What if a pencil asked one simple question?",
      "What if a tea cup described the morning?",
      "What if a streetlight welcomed the night?",
      "What if a bus stop told a short story?",
      "What if a notebook learned a new word?"
    ]
  },
  {
    "id": "safe-satire-everyday-systems",
    "title": "Safe everyday satire",
    "description": "Non-political satire about forms, queues, customer support, approvals, and tiny official systems.",
    "prompts": [
      "What if a queue issued queue numbers to itself?",
      "What if a form asked humans to fill their feelings?",
      "What if a help desk needed help from another help desk?",
      "What if a token machine became a motivational speaker?",
      "What if a photocopy shop started a memory clinic?",
      "What if a stamp pad demanded artistic credit?",
      "What if a receipt asked for emotional reimbursement?",
      "What if a complaint box started giving advice?",
      "What if an office file refused to move without snacks?",
      "What if a chair required booking approval?",
      "What if a waiting room hosted a patience Olympics?",
      "What if a signature became a celebrity?"
    ]
  },
  {
    "id": "indian-city-slice-of-life",
    "title": "Indian city slice-of-life",
    "description": "Local but broad Indian city prompts: autos, metro, apartments, chai, tuition, markets, and monsoon.",
    "prompts": [
      "What if auto meters started telling the truth emotionally?",
      "What if apartment lifts formed a gossip network?",
      "What if chai stalls became weather departments?",
      "What if tuition classes opened on the moon?",
      "What if metro cards stored human moods?",
      "What if vegetable markets had sports commentary?",
      "What if street dogs reviewed traffic rules?",
      "What if rainwater puddles created tourist maps?",
      "What if apartment security gates wrote novels?",
      "What if mobile recharge shops became philosophers?",
      "What if city buses ran a poetry club?",
      "What if potholes applied for heritage status?"
    ]
  },
  {
    "id": "science-concept-comedy",
    "title": "Science concept comedy",
    "description": "Harmless science-adjacent prompts that can lead to fake reports while keeping real science separate from nonsense.",
    "prompts": [
      "What if friction opened a complaint office?",
      "What if evaporation forgot its timetable?",
      "What if magnets became friendship experts?",
      "What if shadows demanded proof of identity?",
      "What if plants held a photosynthesis press meet?",
      "What if sound waves formed a music band?",
      "What if planets debated gravity rules?",
      "What if acids and bases attended mediation?",
      "What if atoms tried to organize a family photo?",
      "What if light rays needed traffic lanes?",
      "What if simple machines opened a gym?",
      "What if electricity requested a holiday letter?"
    ]
  },
  {
    "id": "maths-masti-curated",
    "title": "Maths masti curated",
    "description": "Math-flavored absurdity for jokes, warmups, and concept bridges without claiming formal instruction.",
    "prompts": [
      "What if zero became a celebrity?",
      "What if fractions opened a pizza court?",
      "What if multiplication tables started singing?",
      "What if geometry shapes formed a dance group?",
      "What if decimals demanded exact respect?",
      "What if division became a fairness officer?",
      "What if the number line became a railway platform?",
      "What if angles started giving directions?",
      "What if word problems became detectives?",
      "What if square roots opened a mystery club?",
      "What if percentages started negotiating discounts?",
      "What if graphs began telling stories?"
    ]
  },
  {
    "id": "creator-reel-ready",
    "title": "Creator reel ready",
    "description": "Prompts suited for short video scripts, hooks, captions, and visual comedy briefs.",
    "prompts": [
      "What if your alarm clock made a morning vlog?",
      "What if a samosa gave startup advice in 30 seconds?",
      "What if Bengaluru traffic had a trailer voiceover?",
      "What if a school bag did a day-in-my-life reel?",
      "What if clouds reacted to weather apps?",
      "What if a pencil gave exam survival tips?",
      "What if idlis reviewed fancy restaurants?",
      "What if a metro card explained office life?",
      "What if a chai cup ranked Monday moods?",
      "What if a pothole gave a TED-style talk?",
      "What if a phone battery became a life coach?",
      "What if a dustbin made a cleanliness influencer reel?"
    ]
  },
  {
    "id": "bedtime-gentle-worlds-plus",
    "title": "Bedtime gentle worlds plus",
    "description": "Soft, low-conflict absurd prompts for children, calm storytelling, and gentle imagination.",
    "prompts": [
      "What if the moon tucked clouds into bed?",
      "What if pillows collected sleepy wishes?",
      "What if stars opened a quiet library?",
      "What if the night breeze delivered dreams?",
      "What if blankets had tiny maps of comfort?",
      "What if fireflies became bedtime lanterns?",
      "What if a sleepy train carried yawns?",
      "What if clouds learned lullabies?",
      "What if a teddy bear ran a kindness school?",
      "What if slippers guarded dreams at the door?",
      "What if the ceiling fan hummed stories?",
      "What if the window watched the moon politely?"
    ]
  },
  {
    "id": "group-game-prompts",
    "title": "Group game prompts",
    "description": "Prompts that work well when friends, families, or classrooms add rules one by one.",
    "prompts": [
      "What if everyone had to obey one rule made by a banana?",
      "What if the room became a tiny country for five minutes?",
      "What if each person represented one vegetable in an election?",
      "What if the group had to design a cloud school?",
      "What if every object in the room got one vote?",
      "What if a chair became the judge of today?",
      "What if the team had to invent a new festival for socks?",
      "What if one pencil became mayor and made three rules?",
      "What if everyone had to pitch a startup for a spoon?",
      "What if the group created a new planet for snacks?",
      "What if the floor became lava but very polite?",
      "What if the team had to solve a missing umbrella case?"
    ]
  },
  {
    "id": "quality-test-prompts",
    "title": "Quality test prompts",
    "description": "Prompts selected to test whether the engine can create explanation, quotes, scene, report, poster, and next prompts well.",
    "prompts": [
      "What if the moon opened a coaching center?",
      "What if vegetables had elections?",
      "What if crows ran Bengaluru traffic?",
      "What if your school bag could complain?",
      "What if monsoon clouds had WhatsApp groups?",
      "What if idlis started a startup?",
      "What if gravity took a tea break?",
      "What if umbrellas went on strike?",
      "What if pencils refused exams?",
      "What if traffic signals gave life advice?",
      "What if the blackboard started giving attendance?",
      "What if the sun needed an alarm clock?"
    ]
  },
  {
    "id": "poster-first-indian-hooks",
    "title": "Poster-first Indian hooks",
    "description": "Indian-context poster prompts with one strong visual, one object, and one obvious punchline direction.",
    "prompts": [
      "What if chai solved Monday?",
      "What if an auto became a philosopher?",
      "What if a tiffin box ran a secret mission?",
      "What if monsoon clouds became admins?",
      "What if a traffic signal lost patience?",
      "What if a school bag resigned?",
      "What if idli opened a gym?",
      "What if samosa became a detective?",
      "What if a pothole became famous?",
      "What if an umbrella demanded respect?",
      "What if a metro card knew too much?",
      "What if a pressure cooker became anchor?"
    ]
  },
  {
    "id": "character-voice-tests",
    "title": "Character voice tests",
    "description": "Prompts built to produce distinct voices: serious object, confused assistant, dramatic witness, and tiny expert.",
    "prompts": [
      "What if the chalk became a courtroom witness?",
      "What if the fan became a tired philosopher?",
      "What if the spoon became a strict principal?",
      "What if the umbrella became a dramatic hero?",
      "What if the school bell became a punctuality coach?",
      "What if the moon became a confused teacher?",
      "What if the traffic cone became a safety expert?",
      "What if the notebook became a secret keeper?",
      "What if the dustbin became a public speaker?",
      "What if the fridge became a midnight security guard?",
      "What if the pencil became a nervous reporter?",
      "What if the bus ticket became a travel poet?"
    ]
  },
  {
    "id": "story-expansion-tests",
    "title": "Story expansion tests",
    "description": "Prompts that can scale from one joke to scene, quest, mystery, and serial world.",
    "prompts": [
      "What if a lost umbrella became a city hero?",
      "What if a tiffin box had to save lunch time?",
      "What if a pencil had to recover missing marks?",
      "What if a cloud forgot where to rain?",
      "What if a samosa had to solve a kitchen mystery?",
      "What if the moon had to pass an exam?",
      "What if a book escaped from the library at night?",
      "What if a traffic signal had one day off?",
      "What if a pillow had to protect dreams?",
      "What if a metro card lost its memory?",
      "What if a mango had to become king for a day?",
      "What if a small ant ran a huge delivery mission?"
    ]
  },
  {
    "id": "editorial-gold-sparks",
    "title": "Editorial gold sparks",
    "description": "Prompts selected for strong punchline, visual clarity, safe absurdity, and repeat value.",
    "prompts": [
      "What if traffic signals started giving life advice?",
      "What if slippers filed a missing-foot complaint?",
      "What if tea cups became weather reporters?",
      "What if ceiling fans opened a calmness academy?",
      "What if lunch plates started a review channel?",
      "What if bus stops formed a patience club?",
      "What if keys became escape artists?",
      "What if curtains joined a drama school?",
      "What if doorbells became neighborhood journalists?",
      "What if socks demanded equal partnership?"
    ]
  },
  {
    "id": "best-whatsapp-status",
    "title": "Best WhatsApp status hooks",
    "description": "Short ideas that can become funny status lines, family shares, and quick forwards.",
    "prompts": [
      "What if Monday asked for sick leave?",
      "What if Wi-Fi became a moody family member?",
      "What if alarms started negotiating with sleep?",
      "What if tea stalls became parliaments of opinion?",
      "What if grocery lists started judging shoppers?",
      "What if umbrellas charged surge pricing?",
      "What if charging cables started giving lectures?",
      "What if lunch breaks formed a political party?",
      "What if traffic jams started yoga classes?",
      "What if notification sounds became gossip aunties?"
    ]
  },
  {
    "id": "classroom-five-minute-warmups",
    "title": "Classroom five-minute warmups",
    "description": "Teacher-safe prompts that support imagination, vocabulary, speaking, drawing, and quick group discussion.",
    "prompts": [
      "What if the classroom clock became the class monitor?",
      "What if chalk pieces opened a tiny library?",
      "What if multiplication tables formed a cricket team?",
      "What if maps started correcting tourists?",
      "What if science diagrams came alive during revision?",
      "What if grammar rules held a complaint meeting?",
      "What if water bottles taught evaporation?",
      "What if geometry boxes opened an architecture firm?",
      "What if planets attended morning assembly?",
      "What if the attendance register became a detective?"
    ]
  },
  {
    "id": "family-evening-play",
    "title": "Family evening play",
    "description": "Gentle prompts for parents, kids, siblings, grandparents, and dinner-table storytelling.",
    "prompts": [
      "What if the dining table started family meetings?",
      "What if the TV remote became a peace negotiator?",
      "What if grandparents' spectacles could replay memories?",
      "What if the pressure cooker became a singer?",
      "What if the sofa started charging rent?",
      "What if the fridge became a midnight guard?",
      "What if the washing machine became a dance teacher?",
      "What if the balcony plants started giving advice?",
      "What if the house keys started a secret club?",
      "What if the family calendar became a strict principal?"
    ]
  },
  {
    "id": "poster-one-line-hooks",
    "title": "Poster one-line hooks",
    "description": "Prompts with a clean visual headline and one strong poster joke.",
    "prompts": [
      "What if the moon offered crash courses?",
      "What if rain clouds muted the group chat?",
      "What if crows issued traffic challans?",
      "What if vegetables promised free chutney for votes?",
      "What if gravity went on annual leave?",
      "What if pencils launched an exam boycott?",
      "What if samosas solved crimes after tea?",
      "What if autos used rocket fuel for short trips?",
      "What if idlis pitched to investors?",
      "What if shoes demanded travel allowance?"
    ]
  },
  {
    "id": "serial-episode-starters",
    "title": "Serial episode starters",
    "description": "Ideas that can grow into recurring characters, running gags, and weekly absurd episodes.",
    "prompts": [
      "What if a tiny complaint office opened inside every school bag?",
      "What if a crow commissioner solved one city problem every Friday?",
      "What if a cloud admin mismanaged monsoon every week?",
      "What if a vegetable cabinet ran a tiny country?",
      "What if a school bench recorded classroom secrets?",
      "What if a tea cup detective investigated missing biscuits?",
      "What if a metro card became a time traveler?",
      "What if a pencil reporter covered exam season news?",
      "What if an umbrella union negotiated rainy-day rights?",
      "What if a moon tutor opened branches across the solar system?"
    ]
  },
  {
    "id": "language-practice-clean-lines",
    "title": "Language practice clean lines",
    "description": "Prompts designed to create simple lines that translate well into Hindi, Odia, Hinglish, and other Indian-language packs.",
    "prompts": [
      "What if the sun forgot its morning duty?",
      "What if a mango wanted to become a teacher?",
      "What if a book asked for a holiday?",
      "What if rain drops stood in a queue?",
      "What if a chair wanted respect?",
      "What if a pencil wanted a new job?",
      "What if a cloud lost its address?",
      "What if a bus ticket told stories?",
      "What if a flower opened a small school?",
      "What if a spoon became the kitchen captain?"
    ]
  },
  {
    "id": "visual-comic-ready",
    "title": "Visual comic ready",
    "description": "Prompts with clear characters, settings, expressions, and three-panel comic potential.",
    "prompts": [
      "What if a traffic cone became a strict principal?",
      "What if two umbrellas argued at a bus stop?",
      "What if a tiffin box escaped during lunch break?",
      "What if a pillow interviewed dreams?",
      "What if a dustbin became a motivational speaker?",
      "What if a laptop charger opened emergency services?",
      "What if a blackboard blinked during exams?",
      "What if a tomato gave a campaign speech?",
      "What if a cloud wore sunglasses to avoid raining?",
      "What if a shoe got lost and became a travel guide?"
    ]
  },
  {
    "id": "safe-satire-everyday",
    "title": "Safe satire everyday",
    "description": "Non-political, non-targeted satire about ordinary systems, tiny rules, committees, and over-serious procedures.",
    "prompts": [
      "What if lift buttons required application forms?",
      "What if apartment notices started poetry competitions?",
      "What if queue tokens became VIP celebrities?",
      "What if office staplers formed a productivity task force?",
      "What if billing counters held talent shows?",
      "What if parking slots became courtroom judges?",
      "What if ID cards started performance reviews?",
      "What if waiting rooms became philosophical clubs?",
      "What if feedback forms gave feedback to customers?",
      "What if photocopy machines opened a truth commission?"
    ]
  },
  {
    "id": "indian-childhood-nostalgia",
    "title": "Indian childhood nostalgia",
    "description": "School, summer, cousins, tuition, exams, tiffin, games, and harmless childhood imagination.",
    "prompts": [
      "What if summer holidays had a complaint box?",
      "What if tuition benches wrote secret diaries?",
      "What if cricket balls returned with travel stories?",
      "What if tiffin spoons organized a lunch orchestra?",
      "What if report cards became emotional counsellors?",
      "What if school shoes planned escape routes?",
      "What if cousin groups elected a mango captain?",
      "What if homework hid under the bed?",
      "What if exam halls had weather forecasts?",
      "What if cycle bells became neighborhood announcers?"
    ]
  },
  {
    "id": "science-without-confusion",
    "title": "Science without confusion",
    "description": "Absurd prompts that can be funny while keeping real concepts clearly separate from fake science.",
    "prompts": [
      "What if atoms had apartment meetings?",
      "What if shadows submitted attendance?",
      "What if magnets started friendship clubs?",
      "What if plants used solar panels for extra snacks?",
      "What if the water cycle hired a manager?",
      "What if friction became a traffic police officer?",
      "What if sound waves opened a music school?",
      "What if light rays started a delivery service?",
      "What if bacteria opened a cleanliness workshop?",
      "What if gravity wrote a leave application?"
    ]
  },
  {
    "id": "best-demo-prompts",
    "title": "Best demo prompts",
    "description": "High-confidence prompts for showing the product to someone for the first time.",
    "prompts": [
      "What if monsoon clouds had WhatsApp groups?",
      "What if crows ran Bengaluru traffic?",
      "What if the moon opened a coaching center?",
      "What if your school bag could complain?",
      "What if vegetables had elections?",
      "What if gravity took a tea break?",
      "What if idlis started a startup?",
      "What if pencils refused exams?",
      "What if umbrellas went on strike?",
      "What if tea cups became news anchors?"
    ]
  },
  {
    "id": "group-game-rounds",
    "title": "Group game rounds",
    "description": "Prompts built for turn-taking, voting, team writing, and quick family/classroom games.",
    "prompts": [
      "What if everyone had to invent one rule for a potato kingdom?",
      "What if each team had to defend one talking object?",
      "What if clouds voted on where to rain next?",
      "What if shoes ran a travel quiz show?",
      "What if lunch boxes competed in a talent round?",
      "What if pencils held a press conference?",
      "What if each vegetable gave one campaign promise?",
      "What if the moon asked students for homework excuses?",
      "What if every chair had to tell one secret?",
      "What if a crow court judged traffic mistakes?"
    ]
  },
  {
    "id": "creator-reel-polished",
    "title": "Creator reel polished",
    "description": "Prompts structured for hooks, beats, punchlines, and short-form captions.",
    "prompts": [
      "What if your phone battery had trust issues?",
      "What if rain clouds posted daily vlogs?",
      "What if traffic jams gave productivity tips?",
      "What if coffee cups exposed office secrets?",
      "What if school bags had podcast episodes?",
      "What if vegetables reacted to election results?",
      "What if the moon reviewed coaching centers?",
      "What if umbrellas made influencer reels?",
      "What if auto meters became motivational gurus?",
      "What if notebooks leaked behind-the-scenes footage?"
    ]
  },
  {
    "id": "locality-agnostic-sparks",
    "title": "Locality-agnostic sparks",
    "description": "Prompts that work in India, global contexts, schools, homes, markets, and generic cities.",
    "prompts": [
      "What if streetlights had opinions?",
      "What if notebooks changed their own titles?",
      "What if buses chose scenic routes for fun?",
      "What if parks held secret meetings at dawn?",
      "What if vending machines became life coaches?",
      "What if stairs complained about elevators?",
      "What if benches became interviewers?",
      "What if newspapers asked follow-up questions?",
      "What if windows became weather critics?",
      "What if calendars started negotiating deadlines?"
    ]
  },
  {
    "id": "character-voice-anchors",
    "title": "Character voice anchors",
    "description": "Prompts for testing whether the engine creates distinct, playable character voices.",
    "prompts": [
      "What if a strict potato became the principal?",
      "What if a nervous pencil became a reporter?",
      "What if a dramatic cloud became a film star?",
      "What if a practical lunch box became the hero?",
      "What if a confused crow became commissioner?",
      "What if a wise old umbrella became a mentor?",
      "What if a tiny ant became operations manager?",
      "What if a sarcastic spoon became kitchen auditor?",
      "What if a sleepy moon became a tutor?",
      "What if a cheerful slipper became tour guide?"
    ]
  },
  {
    "id": "high-retention-followups",
    "title": "High-retention followups",
    "description": "Prompts that naturally produce sequels, spin-offs, alternate endings, and repeated play.",
    "prompts": [
      "What if the first absurd rule worked too well?",
      "What if the sidekick accidentally became famous?",
      "What if the villain was only looking for snacks?",
      "What if the city copied the silly idea everywhere?",
      "What if the tiny committee had to face an audit?",
      "What if the poster became more popular than the event?",
      "What if the assistant knew the real secret?",
      "What if the next day made the problem even funnier?",
      "What if a rival group copied the same nonsense?",
      "What if the final rule created a new mystery?"
    ]
  },
  {
    "id": "quality-control-tests",
    "title": "Quality control tests",
    "description": "Stress-test prompts for clarity, safety, localization, poster-readiness, and non-confusing fake science.",
    "prompts": [
      "What if gravity submitted a leave application?",
      "What if a real-looking news desk reported a clearly fake pencil strike?",
      "What if a vegetable election needed to stay non-political?",
      "What if a classroom joke needed to be safe for Class 3?",
      "What if a Hinglish line needed to stay understandable to grandparents?",
      "What if a poster had only six words for the punchline?",
      "What if a science joke needed a clear fake label?",
      "What if a group game needed no props?",
      "What if a bedtime version needed no loud chaos?",
      "What if a sequel needed the same running gag?"
    ]
  },
  {
    "id": "regional-flavour-seeds",
    "title": "Regional flavour seeds",
    "description": "Prompts that invite local details without depending on stereotypes or sensitive identity jokes.",
    "prompts": [
      "What if a coastal breeze opened a fish-free weather office?",
      "What if a hill road became a travel storyteller?",
      "What if a weekly haat started a comedy club?",
      "What if a temple bell became a timekeeper without giving sermons?",
      "What if a village pond appointed a cleanliness captain?",
      "What if a city metro card became a polite guide?",
      "What if a tea stall became a weather control room?",
      "What if a market lane started giving directions in rhymes?",
      "What if a school veranda became a debate hall?",
      "What if a local bus became a memory museum?"
    ]
  },
  {
    "id": "stable-showcase-best-100",
    "title": "Stable showcase best 100",
    "description": "Hand-curated prompts for demos, WhatsApp cards, classroom warmups, family play, posters, and series seeds.",
    "prompts": [
      "What if crows ran Bengaluru traffic?",
      "What if the moon opened a coaching center?",
      "What if monsoon clouds had WhatsApp groups?",
      "What if vegetables had elections?",
      "What if your school bag could complain?",
      "What if gravity took a tea break?",
      "What if idlis started a startup?",
      "What if pencils refused exams?",
      "What if umbrellas charged surge pricing?",
      "What if the TV remote became a peace negotiator?",
      "What if multiplication tables formed a cricket team?",
      "What if your phone battery had trust issues?",
      "What if a crow commissioner solved one city problem every Friday?",
      "What if traffic signals started giving life advice?",
      "What if phone chargers formed a missing persons bureau?",
      "What if rain drops took attendance before falling?",
      "What if samosas ran a detective agency?",
      "What if homework diaries became detectives?",
      "What if the sun needed an alarm clock?",
      "What if potholes opened a tourism department?",
      "What if goats became school inspectors?",
      "What if street dogs opened a bank?",
      "What if pigeons controlled airport announcements?",
      "What if cows reviewed restaurant menus?",
      "What if monkeys became apartment security guards?",
      "What if ants ran a logistics ministry?",
      "What if buffaloes became fitness influencers?",
      "What if squirrels ran the electricity board?",
      "What if parrots became news editors?",
      "What if the blackboard started giving attendance?",
      "What if lunch boxes formed a secret union?",
      "What if erasers started a memory-loss clinic?",
      "What if report cards started giving marks to teachers?",
      "What if school bells demanded work-life balance?",
      "What if sharpeners opened a career counselling desk?",
      "What if water bottles started giving exam tips?",
      "What if laddus became gym trainers?",
      "What if pani puri opened a court of justice?",
      "What if dosas launched a space mission?",
      "What if biryani had a passport office?",
      "What if chutney became a celebrity manager?",
      "What if rotis held a round-table conference?",
      "What if mangoes opened a summer parliament?",
      "What if umbrellas went on strike?",
      "What if thunder became a motivational speaker?",
      "What if fog opened a mystery school?",
      "What if sunshine charged a subscription fee?",
      "What if rainbows started a colour consultancy?",
      "What if wind became a gossip reporter?",
      "What if clouds started performance appraisals?",
      "What if winter sweaters became climate advisors?",
      "What if Mars had a chai stall?",
      "What if satellites started gossiping?",
      "What if gravity took a holiday?",
      "What if stars started parent-teacher meetings?",
      "What if aliens came only to compare school marks?",
      "What if comets needed traffic permits?",
      "What if black holes opened storage lockers?",
      "What if planets opened a group tuition batch?",
      "What if elevators chose passengers by mood?",
      "What if dustbins started customer support?",
      "What if metro cards became relationship counselors?",
      "What if parking cones started a discipline academy?",
      "What if speed breakers demanded respect?",
      "What if streetlights became night-shift supervisors?",
      "What if zebra crossings started checking confidence levels?",
      "What if ants created a passport office?",
      "What if coconuts built a consulting firm?",
      "What if chalk pieces became motivational speakers?",
      "What if slippers required driving licenses?",
      "What if water bottles started issuing warnings?",
      "What if ceiling fans formed a review board?",
      "What if teaspoons needed appointment slots?",
      "What if cushions created a grievance portal?",
      "What if matchboxes required fire-safety PowerPoints?",
      "What if bookmarks created a reading approval board?",
      "What if remote controls hired bodyguards?",
      "What if curtains started weather forecasting?",
      "What if pressure cookers became news anchors?",
      "What if socks held a missing partner summit?",
      "What if fridge magnets started giving career advice?",
      "What if pillows demanded weekend overtime?",
      "What if buckets opened a rainwater bank?",
      "What if mirrors started annual appraisal meetings?",
      "What if washing machines became relationship therapists for socks?",
      "What if doorbells started background verification?",
      "What if Diwali diyas formed a power company?",
      "What if Holi colours started a diplomatic mission?",
      "What if festival sweets demanded quality reviews?",
      "What if puja flowers opened a complaint desk?",
      "What if wedding chairs started seat allocation?",
      "What if crackers attended a noise-control workshop?",
      "What if rangoli patterns held a design award?",
      "What if gift boxes started emotional blackmail?",
      "What if fairy lights created a startup for brightness?",
      "What if invitation cards started ranking guests by punctuality?",
      "What if ants launched a logistics startup?",
      "What if coconuts built a consulting company?",
      "What if dust particles opened a cleaning app?",
      "What if bananas created a fitness wearable?"
    ]
  },
  {
    "id": "recurring-character-universe",
    "title": "Recurring character universe",
    "description": "Named recurring characters that make the product feel like an absurd world, not only random jokes.",
    "prompts": [
      "What if Crow Commissioner Cawdesh inspected every traffic signal?",
      "What if Professor Moonlal opened a night-school coaching center?",
      "What if Bagamma the School Bag filed a daily complaint report?",
      "What if Onion Minister Netranath won every vegetable debate by emotional strategy?",
      "What if Cloud Admin 108 muted the monsoon group at the worst time?",
      "What if Inspector Pencil refused to write during surprise tests?",
      "What if Idli Founder Idlix pitched breakfast-as-a-service?",
      "What if Gravity Uncle took one disciplined tea break every afternoon?",
      "What if Remote Rani negotiated peace between TV channels?",
      "What if Battery Babu started asking for emotional recharge?",
      "What if Umbrella Devi launched rain-protection surge pricing?",
      "What if Metro Card Mohan started giving life advice at the gate?",
      "What if Traffic Signal Tara began judging everyone by patience level?",
      "What if Tiffin Captain opened a lunchbox parliament?",
      "What if Pothole Prasad became a local tourism guide?",
      "What if Blackboard Bindu started grading handwriting confidence?"
    ]
  },
  {
    "id": "share-card-ready-final",
    "title": "Share-card ready final prompts",
    "description": "Short, visual prompts designed for WhatsApp status, poster cards, and quick creator use.",
    "prompts": [
      "What if clouds needed admin approval before raining?",
      "What if school bells demanded work-life balance?",
      "What if lunch boxes formed a secret union?",
      "What if metro cards became relationship counselors?",
      "What if report cards started giving marks to teachers?",
      "What if traffic cones opened a discipline academy?",
      "What if slippers required driving licenses?",
      "What if umbrellas filed rain overtime claims?",
      "What if Wi-Fi routers became family counselors?",
      "What if exam papers started asking students for feedback?",
      "What if pencils opened a silent protest desk?",
      "What if the moon sold tuition batches by phase?",
      "What if dustbins started customer support?",
      "What if auto meters started telling bedtime stories?",
      "What if rainbows started a colour consultancy?",
      "What if a tea stall became a weather control room?",
      "What if vegetables formed coalition governments without politics?",
      "What if gravity submitted a leave application?",
      "What if shadows refused to follow lazy people?",
      "What if calendar dates started taking casual leave?"
    ]
  },
  {
    "id": "hinglish-showcase-samples",
    "title": "Hinglish showcase samples",
    "description": "Human-tuned Hinglish-friendly prompts for status lines, reels, and family comedy.",
    "prompts": [
      "What if monsoon clouds said, “Admin approval ke bina rain nahi hoga”?",
      "What if school bags said, “Boss, homework ka weight emotional hai”?",
      "What if crows at Silk Board said, “Signal hum sambhal lenge, tum peanuts lao”?",
      "What if idlis pitched, “Breakfast ko scalable banana padega”?",
      "What if pencils said, “Exam ke time network issue aa gaya”?",
      "What if umbrellas said, “Rain protection ab premium feature hai”?",
      "What if traffic signals said, “Patience dikhao, green light milega”?",
      "What if phone batteries said, “Low battery nahi, low trust hai”?",
      "What if vegetables said, “Sabzi cabinet meeting abhi start hogi”?",
      "What if moon tuition said, “Full-moon batch already full hai”?",
      "What if remote control said, “Channel change se pehle peace treaty sign karo”?",
      "What if homework diary said, “Mere paas sab evidence hai”?"
    ]
  }
];
const riskyTerms = [
  'kill', 'bomb', 'weapon', 'suicide', 'self harm', 'terror', 'caste', 'religion', 'hate',
  'nude', 'sex', 'drug', 'politician', 'minister', 'prime minister', 'president', 'election violence', 'real person', 'communal', 'violence', 'blood', 'abuse'
];

const flavorDetails = {
  india: { places: ['a busy market', 'a tuition lane', 'a railway platform', 'a tea stall', 'a school assembly'], object: 'steel tiffin', snack: 'samosa', authority: 'Very Serious Committee', exclamation: 'Arre', phrase: 'full public confusion' },
  bengaluru: { places: ['Silk Board junction', 'Whitefield signal', 'Koramangala cafe lane', 'a metro station', 'an office shuttle stop'], object: 'ID card', snack: 'filter coffee', authority: 'Traffic Innovation Board', exclamation: 'Ayyo', phrase: 'peak Bengaluru logic' },
  school: { places: ['the last bench', 'morning assembly', 'the staff room', 'the exam hall', 'the playground'], object: 'homework diary', snack: 'tiffin', authority: 'Discipline Committee', exclamation: 'Excuse me', phrase: 'homework-level chaos' },
  monsoon: { places: ['a flooded lane', 'a balcony', 'a bus stop', 'a cloud meeting room', 'a roof terrace'], object: 'umbrella', snack: 'pakora', authority: 'Rainfall Review Board', exclamation: 'Splash', phrase: 'drizzle-based drama' },
  space: { places: ['a lunar classroom', 'an asteroid tea stall', 'a satellite corridor', 'Mars sector 7', 'a gravity checkpoint'], object: 'space helmet', snack: 'moon biscuit', authority: 'Galactic Permission Office', exclamation: 'Orbit alert', phrase: 'zero-gravity nonsense' },
  global: { places: ['a city square', 'a school hallway', 'a tiny office', 'a rooftop', 'a mysterious laboratory'], object: 'clipboard', snack: 'sandwich', authority: 'International Absurdity Council', exclamation: 'Attention', phrase: 'official nonsense' },
  market: { places: ['a crowded bazaar', 'a street food corner', 'a billing counter', 'a vegetable lane', 'a bargaining zone'], object: 'shopping bag', snack: 'chaat', authority: 'Market Mischief Board', exclamation: 'Rate final', phrase: 'discount-level drama' },
  nature: { places: ['a banyan tree council', 'a river bend', 'a garden bench', 'a hilltop meeting', 'a bee office'], object: 'leaf file', snack: 'coconut water', authority: 'Nature Nonsense Sabha', exclamation: 'Rustle alert', phrase: 'eco-friendly confusion' },
  tech: { places: ['a charging station', 'a notification hallway', 'a password counter', 'a keyboard court', 'a Wi-Fi waiting room'], object: 'charging cable', snack: 'digital biscuit', authority: 'Gadget Grievance Cell', exclamation: 'Low battery', phrase: 'notification-powered chaos' },
  science: { places: ['a tiny science lab', 'a classroom experiment table', 'a gravity checkpoint', 'a notebook observatory', 'a silly research desk'], object: 'lab notebook', snack: 'glucose biscuit', authority: 'Silly Science Bureau', exclamation: 'Observation alert', phrase: 'fake-science comedy' },
  local: { places: ['a small-town bus stop', 'a village notice board', 'a weekly market', 'a school veranda', 'a tea stall corner'], object: 'notice board', snack: 'puffed rice', authority: 'Local Laughing Sabha', exclamation: 'Listen everyone', phrase: 'neighborhood-level comedy' },
  poster: { places: ['a vertical poster frame', 'a reel thumbnail studio', 'a caption workshop', 'a comic cover desk', 'a share-card factory'], object: 'headline sticker', snack: 'popcorn', authority: 'Poster Punchline Board', exclamation: 'Big headline', phrase: 'poster-first drama' }
};
const toneDetails = {
  clean: { label: 'Clean comedy', adjective: 'suspiciously polite', ending: 'Everyone agreed to pretend this was normal.' },
  school: { label: 'School funny', adjective: 'homework-powered', ending: 'The class monitor wrote it down as a discipline issue.' },
  meme: { label: 'Meme-ish', adjective: 'too confident for no reason', ending: 'The internet immediately made seventeen versions of it.' },
  science: { label: 'Fake science', adjective: 'laboratory-certified', ending: 'Scientists requested more snacks before confirming the results.' },
  dramatic: { label: 'Dramatic absurd', adjective: 'unnecessarily cinematic', ending: 'A dramatic wind blew, even indoors.' }
};

const lensDetails = {
  bureaucracy: { label: 'Tiny bureaucracy', device: 'forms, approvals, committees, and rules nobody requested', conflict: 'approval confusion', punch: 'A form was created to explain why the previous form was not enough.' },
  social: { label: 'Social drama', device: 'gossip, family reactions, public opinion, and accidental celebrity status', conflict: 'everyone taking sides for no reason', punch: 'By evening, even neutral objects had strong opinions.' },
  science: { label: 'Fake science', device: 'fake experiments, impossible metrics, graphs, and lab warnings', conflict: 'data becoming more dramatic than the event', punch: 'The graph went upward because it wanted attention.' },
  news: { label: 'Breaking news', device: 'anchors, tickers, witnesses, and over-serious updates', conflict: 'a small event being treated like a national briefing', punch: 'The live reporter whispered, “This could have been an email.”' },
  startup: { label: 'Startup pitch', device: 'founders, investors, demos, pivots, and very confident slides', conflict: 'a tiny problem being pitched as a billion-user platform', punch: 'The pitch deck had 42 slides and only one working button.' },
  classroom: { label: 'Classroom lens', device: 'lessons, questions, worksheets, group tasks, and funny learning moments', conflict: 'learning turning into harmless chaos', punch: 'The teacher called it active learning and everyone clapped.' },
  cinema: { label: 'Cinema trailer', device: 'dramatic entry, slow motion, background music, and unnecessary suspense', conflict: 'ordinary things behaving like blockbuster heroes', punch: 'The trailer ended before anyone understood the plot.' }
};

const storyRecipeDetails = {
  escalation: { label: 'Escalation ladder', shape: 'small problem → public confusion → official rule → punchline', hook: 'A tiny problem became a full public system.', beat: 'Each solution accidentally created a bigger but harmless problem.', payoff: 'The smallest person in the scene gave the most sensible answer.' },
  mystery: { label: 'Silly mystery', shape: 'strange clue → suspects → false explanation → harmless reveal', hook: 'Nobody knew who started the nonsense, so everyone blamed the nearest object.', beat: 'Every clue looked serious but pointed toward snacks.', payoff: 'The mystery was solved by asking the quiet object in the corner.' },
  mockumentary: { label: 'Mockumentary', shape: 'interviews → expert comments → over-serious narration → awkward truth', hook: 'A serious documentary team arrived for a completely unserious situation.', beat: 'Witnesses explained normal events with extreme confidence.', payoff: 'The narrator admitted the whole case could have been shorter.' },
  quest: { label: 'Mini quest', shape: 'mission → helper → obstacle → ridiculous reward', hook: 'A tiny hero accepted a mission nobody else understood.', beat: 'The obstacle was mostly paperwork, weather, or misplaced snacks.', payoff: 'The reward was ceremonial, confusing, and oddly satisfying.' },
  rivalry: { label: 'Friendly rivalry', shape: 'two sides → challenge → over-preparation → joint failure → shared laugh', hook: 'Two harmless groups took a small disagreement too seriously.', beat: 'Both sides prepared like it was a world championship.', payoff: 'They finally teamed up because the snack table was on neither side.' }
};


const contentGoalDetails = {
  laugh: { label: 'Casual laugh', promise: 'fast punchline, quick replay, low reading effort', outputHint: 'one shareable joke and one weird rule' },
  family: { label: 'Family storytelling', promise: 'gentle characters, warm ending, easy parent-child reading', outputHint: 'one tiny scene with a soft payoff' },
  classroom: { label: 'Classroom warm-up', promise: 'safe discussion, vocabulary, drawing, and group activity', outputHint: 'one explainable joke plus one class task' },
  creator: { label: 'Creator post', promise: 'hooks, captions, poster text, and short-form structure', outputHint: 'one hook, one caption, one status line' },
  poster: { label: 'Poster first', promise: 'visual clarity, headline, punchline, and composition notes', outputHint: 'one clean poster idea' },
  series: { label: 'Series episode', promise: 'recurring cast, running gag, and next episode structure', outputHint: 'one repeatable world rule and sequel seed' },
  language: { label: 'Language practice', promise: 'simple wording, translation-friendly phrasing, and reusable vocabulary', outputHint: 'one clean explanation plus language swaps' },
  game: { label: 'Group game', promise: 'turn the what-if into a quick family/classroom/party activity', outputHint: 'one playable challenge with scoring' },
  world: { label: 'Worldbuilding', promise: 'rules, continuity, locations, recurring conflicts, and episode seeds', outputHint: 'one stable mini-universe' },
  editorial: { label: 'Editorial polish', promise: 'strongest line, weakest line, best card, and next improvement', outputHint: 'one polished share card plus one revision note' },
  pilot: { label: 'Demo/pilot proof', promise: 'showcase prompt, replay path, share card, and classroom/family test', outputHint: 'one testable content sample' }
};
const audienceDetails = {
  family: { label: 'Family', softness: 'family-safe', sidekick: 'confused uncle' },
  kid: { label: 'Kid', softness: 'simple and gentle', sidekick: 'tiny helper' },
  creator: { label: 'Creator', softness: 'caption-ready', sidekick: 'overexcited narrator' },
  teacher: { label: 'Teacher', softness: 'classroom-safe', sidekick: 'curious student' }
};
const languageDetails = {
  english: { label: 'English', prefix: '', suffix: 'Clean absurdity', bridge: 'The official explanation stayed very serious, which made the situation worse.' },
  simple: { label: 'Simple English', prefix: 'Simple version: ', suffix: 'Simple + funny', bridge: 'In simple words: everyone was confused, but nobody was in danger.' },
  hinglish: { label: 'Hinglish', prefix: 'Hinglish line: ', suffix: 'Full masti mode', bridge: 'Scene full ulta-pulta ho gaya, but sab log bole: "Thoda funny hai, continue karo."' },
  'hinglish-demo': { label: 'Hinglish Showcase', prefix: 'Hinglish showcase: ', suffix: 'Hinglish card mode', bridge: 'Dialogues stay simple: ek official line, ek confused public line, aur ek clean punchline.' },
  'odia-lite': { label: 'Odia-friendly English', prefix: 'Odia-friendly line: ', suffix: 'Local-friendly mode', bridge: 'The lines stay simple, local, and easy to translate into Odia later.' },
  'hindi-lite': { label: 'Hindi-friendly English', prefix: 'Hindi-friendly line: ', suffix: 'Hindi-friendly mode', bridge: 'The lines stay short, familiar, and easy to convert into Hindi later.' }
};
const loopPresets = {
  full: { label: 'Full Mix', tabs: ['explanation', 'jokemap', 'showcase', 'characters', 'rules', 'comic', 'story', 'alternateendings', 'debate', 'promptcoach', 'visualbrief', 'posterbriefs', 'languagecard', 'localizationpack', 'localitykit', 'audiencevariants', 'quotes', 'report', 'news', 'world', 'continuity', 'seriesbible', 'serialarc', 'episodekit', 'sessionplan', 'creatorcalendar', 'minigame', 'formatrouter', 'challengecard', 'sharevariants', 'sharelibrary', 'punchlinebank', 'bestcards', 'voicekit', 'polishpass', 'contentladder', 'quality', 'sequel', 'sharekit', 'classroom', 'caption', 'poster', 'next'] },
  whatsapp: { label: 'WhatsApp Share', tabs: ['explanation', 'quotes', 'audiencevariants', 'sharevariants', 'sharelibrary', 'sharekit', 'punchlinebank', 'bestcards', 'caption', 'poster', 'next'] },
  comic: { label: 'Comic First', tabs: ['characters', 'comic', 'story', 'alternateendings', 'director', 'voicekit', 'visualbrief', 'posterbriefs', 'quotes', 'news', 'poster', 'next'] },
  teacher: { label: 'Classroom Spark', tabs: ['explanation', 'jokemap', 'rules', 'world', 'classroom', 'sessionplan', 'minigame', 'challengecard', 'debate', 'languagecard', 'localizationpack', 'contentladder', 'polishpass', 'quality', 'sequel', 'next'] },
  creator: { label: 'Creator Pack', tabs: ['caption', 'sharevariants', 'sharelibrary', 'sharekit', 'creatorcalendar', 'punchlinebank', 'bestcards', 'formatrouter', 'visualbrief', 'posterbriefs', 'seriesbible', 'director', 'characters', 'comic', 'story', 'poster', 'next'] },
  deep: { label: 'Deep World', tabs: ['explanation', 'jokemap', 'characters', 'rules', 'world', 'continuity', 'serialarc', 'story', 'alternateendings', 'debate', 'report', 'seriesbible', 'voicekit', 'contentladder', 'episodekit', 'sessionplan', 'quality', 'poster', 'next'] },
  series: { label: 'Series Studio', tabs: ['seriesbible', 'serialarc', 'continuity', 'episodekit', 'characters', 'rules', 'story', 'alternateendings', 'sequel', 'promptcoach', 'voicekit', 'contentladder', 'sessionplan', 'quality', 'next'] },
  posterlab: { label: 'Poster Studio', tabs: ['poster', 'posterbriefs', 'visualbrief', 'formatrouter', 'director', 'sharevariants', 'sharelibrary', 'caption', 'punchlinebank', 'bestcards', 'quotes', 'polishpass', 'quality', 'next'] },
  language: { label: 'Language Lab', tabs: ['explanation', 'languagecard', 'localizationpack', 'localitykit', 'audiencevariants', 'quotes', 'classroom', 'contentladder', 'caption', 'next'] },
  game: { label: 'Group Game', tabs: ['minigame', 'challengecard', 'sessionplan', 'debate', 'characters', 'rules', 'quotes', 'punchlinebank', 'poster', 'next'] },
  editorial: { label: 'Editorial Desk', tabs: ['showcase', 'punchlinebank', 'bestcards', 'polishpass', 'quality', 'posterbriefs', 'visualbrief', 'languagecard', 'localizationpack', 'voicekit', 'contentladder', 'next'] }
};
const tabLabels = {
  explanation: 'Explanation', jokemap: 'Joke Map', showcase: 'Showcase', visualbrief: 'Visual Brief', posterbriefs: 'Poster Briefs', seriesbible: 'Series Bible', serialarc: 'Serial Arc', episodekit: 'Episode Kit', sessionplan: 'Session Plan', creatorcalendar: 'Creator Calendar', localizationpack: 'Localization Pack', sharelibrary: 'Share Library', challengecard: 'Challenge Card', promptcoach: 'Prompt Coach', languagecard: 'Language Card', localitykit: 'Locality Kit', audiencevariants: 'Audience Variants', continuity: 'Continuity', alternateendings: 'Alt Endings', minigame: 'Mini Game', formatrouter: 'Format Router', director: 'Director Notes', sharevariants: 'Share Variants', punchlinebank: 'Punchlines', bestcards: 'Best Cards', voicekit: 'Voice Kit', polishpass: 'Polish Pass', contentladder: 'Content Ladder', quality: 'Quality', characters: 'Characters', rules: 'World Rules', comic: 'Comic', story: 'Tiny Story', debate: 'Debate', quotes: 'Quotes', report: 'Report', news: 'News', world: 'World', sequel: 'Sequels', sharekit: 'Share Kit', classroom: 'Classroom', caption: 'Caption', poster: 'Poster', next: 'Play Again'
};
const promptBuilder = {
  subject: ['crows', 'school bags', 'idlis', 'monsoon clouds', 'traffic signals', 'the moon', 'pencils', 'phone chargers', 'autos', 'shadows', 'Wi-Fi routers', 'vegetables', 'library books', 'umbrellas', 'zero', 'bus tickets', 'village notice boards', 'pillows', 'emojis', 'solar panels'],
  action: ['ran the city', 'opened a coaching center', 'formed a WhatsApp group', 'started elections', 'refused homework', 'became traffic police', 'launched a startup', 'held a press conference', 'started customer support', 'created a secret committee', 'opened a complaint desk', 'became news anchors', 'ran a science experiment', 'hosted a mystery case', 'launched a poster campaign', 'created a group game'],
  place: ['in Bengaluru', 'inside a school', 'during monsoon', 'on the moon', 'at a tea stall', 'inside an apartment', 'near a metro station', 'in a tiny science lab', 'at a railway platform', 'inside a tuition class', 'inside a market', 'in a garden parliament', 'at a cricket ground', 'inside a village fair', 'on a poster wall', 'inside a bedtime story']
};

let builderState = { subject: promptBuilder.subject[0], action: promptBuilder.action[0], place: promptBuilder.place[0] };
const starterPrompts = promptPacks.flatMap(pack => pack.prompts);

const curatedShowcases = [
  { title: 'Traffic comedy', prompt: 'What if crows ran Bengaluru traffic?', tag: 'Strong local visual + instant character conflict', options: { flavor: 'bengaluru', lens: 'bureaucracy', contentGoal: 'poster', outputLoop: 'posterlab', posterStyle: 'comic', absurdity: 5 } },
  { title: 'Moon coaching center', prompt: 'What if the moon opened a coaching center?', tag: 'Best for classroom, poster, and tiny story', options: { flavor: 'space', lens: 'classroom', contentGoal: 'classroom', outputLoop: 'teacher', tone: 'school', absurdity: 4 } },
  { title: 'Cloud WhatsApp group', prompt: 'What if monsoon clouds had WhatsApp groups?', tag: 'Best for fake report + WhatsApp share', options: { flavor: 'monsoon', lens: 'social', contentGoal: 'creator', outputLoop: 'whatsapp', language: 'hinglish', absurdity: 5 } },
  { title: 'Vegetable elections', prompt: 'What if vegetables had elections?', tag: 'Safe satire with cast and debate potential', options: { flavor: 'market', lens: 'bureaucracy', contentGoal: 'game', outputLoop: 'game', storyRecipe: 'rivalry', absurdity: 4 } },
  { title: 'School bag complaint', prompt: 'What if your school bag could complain?', tag: 'Family-safe emotional object comedy', options: { flavor: 'school', lens: 'social', contentGoal: 'family', outputLoop: 'comic', tone: 'school', absurdity: 3 } },
  { title: 'Gravity tea break', prompt: 'What if gravity took a tea break?', tag: 'Fake science without confusing real science', options: { flavor: 'science', lens: 'science', tone: 'science', contentGoal: 'world', outputLoop: 'deep', absurdity: 5 } },
  { title: 'Idli startup', prompt: 'What if idlis started a startup?', tag: 'Creator-ready startup satire', options: { flavor: 'india', lens: 'startup', contentGoal: 'creator', outputLoop: 'creator', absurdity: 4 } },
  { title: 'Pencils refuse exams', prompt: 'What if pencils refused exams?', tag: 'Classroom warm-up + comic panel seed', options: { flavor: 'school', lens: 'classroom', contentGoal: 'classroom', outputLoop: 'teacher', tone: 'school', absurdity: 3 } }

  ,{ title: 'Editorial stress test', prompt: 'What if gravity submitted a leave application?', tag: 'Checks fake science clarity, punchline quality, and safe absurdity', options: { flavor: 'science', lens: 'science', contentGoal: 'editorial', outputLoop: 'editorial', tone: 'science', absurdity: 5 } }
  ,{ title: 'Family evening demo', prompt: 'What if the TV remote became a peace negotiator?', tag: 'Good for family storytelling and gentle character voices', options: { flavor: 'india', lens: 'social', contentGoal: 'family', outputLoop: 'comic', storyRecipe: 'rivalry', absurdity: 3 } }
  ,{ title: 'Classroom five-minute task', prompt: 'What if multiplication tables formed a cricket team?', tag: 'Safe classroom warmup with learning-adjacent imagination', options: { flavor: 'school', lens: 'classroom', contentGoal: 'classroom', outputLoop: 'teacher', language: 'simple', absurdity: 3 } }
  ,{ title: 'Creator reel test', prompt: 'What if your phone battery had trust issues?', tag: 'Short-form hook, status line, and relatable object comedy', options: { flavor: 'tech', lens: 'social', contentGoal: 'creator', outputLoop: 'creator', language: 'hinglish', absurdity: 4 } }
  ,{ title: 'Series retention test', prompt: 'What if a crow commissioner solved one city problem every Friday?', tag: 'Recurring cast, running gag, and episode structure', options: { flavor: 'bengaluru', lens: 'bureaucracy', contentGoal: 'series', outputLoop: 'series', storyRecipe: 'quest', absurdity: 4 } }
  ,{ title: 'Poster headline test', prompt: 'What if umbrellas charged surge pricing?', tag: 'Clear poster image with one-line punch potential', options: { flavor: 'monsoon', lens: 'startup', contentGoal: 'poster', outputLoop: 'posterlab', posterStyle: 'newspaper', absurdity: 4 } }
];


const recurringCharacters = [
  { name: 'Crow Commissioner Cawdesh', terms: ['crow', 'crows', 'traffic', 'signal'], sidekick: 'Pigeon PA Pintu', catchphrase: 'Lane discipline begins in the sky.', runningGag: 'peanut inspection before every decision' },
  { name: 'Professor Moonlal', terms: ['moon', 'coaching', 'tuition', 'space'], sidekick: 'Comet Monitor Chintu', catchphrase: 'Full moon means full syllabus.', runningGag: 'batch timing changes by lunar phase' },
  { name: 'Bagamma the School Bag', terms: ['bag', 'school bag', 'homework', 'tiffin'], sidekick: 'Tiffin Captain Tinku', catchphrase: 'I carry the future and three unfinished notebooks.', runningGag: 'weight complaints in triplicate' },
  { name: 'Onion Minister Netranath', terms: ['vegetable', 'onion', 'sabzi', 'market'], sidekick: 'Tomato Speaker Tamataram', catchphrase: 'This is not crying; this is public consultation.', runningGag: 'emotional debate strategy' },
  { name: 'Cloud Admin 108', terms: ['cloud', 'monsoon', 'rain', 'thunder'], sidekick: 'Thunder Uncle', catchphrase: 'No rain without confirmation.', runningGag: 'muting the group during important updates' },
  { name: 'Inspector Pencil', terms: ['pencil', 'exam', 'classroom', 'homework'], sidekick: 'Eraser Agent Golu', catchphrase: 'I will write only after evidence.', runningGag: 'sharpening the investigation instead of solving it' },
  { name: 'Idli Founder Idlix', terms: ['idli', 'startup', 'breakfast', 'dosa'], sidekick: 'Chutney CTO', catchphrase: 'We are not food; we are a platform.', runningGag: 'turning every snack into a pitch deck' },
  { name: 'Gravity Uncle', terms: ['gravity', 'science', 'fall', 'space'], sidekick: 'Newton Notebook', catchphrase: 'I hold everyone down; at least give me tea.', runningGag: 'tea breaks exactly when stability is needed' }
];
function chooseRecurringCharacter(prompt, seed) {
  const lower = prompt.toLowerCase();
  const matched = recurringCharacters.find(item => item.terms.some(term => lower.includes(term)));
  return matched || recurringCharacters[seed % recurringCharacters.length];
}

const $ = (selector, scope = document) => scope.querySelector(selector);
const $all = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
const state = { audience: 'family', outputLoop: 'full', latestGenerated: null };

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
function normalizePrompt(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 220);
}
function sentenceCase(value) {
  const text = normalizePrompt(value);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}
function titleFromPrompt(prompt) {
  const cleaned = prompt.replace(/^what if\s+/i, '').replace(/[?.!]+$/g, '').trim();
  return cleaned ? `What if ${cleaned}?` : 'What if something impossible happened?';
}
function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return Math.abs(hash);
}
function pick(list, seed = 1, offset = 0) {
  if (!list.length) return '';
  return list[(seed + offset) % list.length];
}
function getSelectedOptions(override = {}) {
  const absurdity = Number(override.absurdity ?? $('#absurdityRange').value ?? 4);
  return {
    audience: override.audience || state.audience || 'family',
    tone: override.tone || $('#toneSelect').value || 'clean',
    lens: override.lens || $('#lensSelect').value || 'bureaucracy',
    storyRecipe: override.storyRecipe || $('#storyRecipeSelect')?.value || 'escalation',
    contentGoal: override.contentGoal || $('#contentGoalSelect')?.value || 'laugh',
    flavor: override.flavor || $('#flavorSelect').value || 'india',
    language: override.language || $('#languageSelect').value || 'english',
    depth: override.depth || $('#depthSelect').value || 'scene',
    posterStyle: override.posterStyle || $('#posterStyleSelect').value || 'pop',
    outputLoop: override.outputLoop || state.outputLoop || 'full',
    absurdity: Math.max(1, Math.min(5, absurdity))
  };
}
function syncControls(options = {}) {
  if (options.audience) {
    state.audience = options.audience;
    $all('.segment').forEach(item => item.classList.toggle('active', item.dataset.audience === state.audience));
  }
  if (options.outputLoop) {
    state.outputLoop = options.outputLoop;
    $all('.loop-btn').forEach(item => item.classList.toggle('active', item.dataset.loop === state.outputLoop));
  }
  if (options.tone) $('#toneSelect').value = options.tone;
  if (options.lens) $('#lensSelect').value = options.lens;
  if (options.storyRecipe && $('#storyRecipeSelect')) $('#storyRecipeSelect').value = options.storyRecipe;
  if (options.contentGoal && $('#contentGoalSelect')) $('#contentGoalSelect').value = options.contentGoal;
  if (options.flavor) $('#flavorSelect').value = options.flavor;
  if (options.language) $('#languageSelect').value = options.language;
  if (options.depth) $('#depthSelect').value = options.depth;
  if (options.posterStyle) $('#posterStyleSelect').value = options.posterStyle;
  if (options.absurdity) {
    $('#absurdityRange').value = String(options.absurdity);
    $('#absurdityValue').textContent = String(options.absurdity);
  }
}
function isRisky(prompt) {
  const lower = prompt.toLowerCase();
  return riskyTerms.some(term => lower.includes(term));
}
function safePrompt(prompt) {
  if (!isRisky(prompt)) return { prompt, redirected: false };
  return {
    prompt: 'What if a very serious potato committee tried to solve a harmless snack emergency?',
    redirected: true
  };
}
function buildPromptFromParts() {
  return sentenceCase(`What if ${builderState.subject} ${builderState.action} ${builderState.place}?`);
}
function subjectLabel(prompt) {
  return prompt.replace(/^what if\s+/i, '').replace(/[?.!]+$/g, '').trim() || 'the impossible idea';
}
function buildCoreWorld(prompt, options) {
  const seed = hashText(prompt + JSON.stringify(options));
  const flavor = flavorDetails[options.flavor] || flavorDetails.india;
  const tone = toneDetails[options.tone] || toneDetails.clean;
  const lens = lensDetails[options.lens] || lensDetails.bureaucracy;
  const audience = audienceDetails[options.audience] || audienceDetails.family;
  const recipe = storyRecipeDetails[options.storyRecipe] || storyRecipeDetails.escalation;
  const goal = contentGoalDetails[options.contentGoal] || contentGoalDetails.laugh;
  const lang = languageDetails[options.language] || languageDetails.english;
  const subject = subjectLabel(prompt);
  const place = pick(flavor.places, seed, 1);
  const authority = flavor.authority;
  const sidekick = audience.sidekick;
  const chaos = pick(['schedule confusion', 'snack-based negotiations', 'official-looking forms', 'tiny emergency meetings', 'overconfident announcements', 'dramatic queue management', 'public overreaction', 'mysterious missing minutes', 'unnecessary training sessions'], seed, 3);
  const secret = pick(['a hidden group chat', 'a forgotten rulebook', 'a suspicious whistle', 'an emotional spreadsheet', 'a snack-powered engine', 'a committee stamp', 'a very serious clipboard'], seed, 4);
  const rule = pick([
    `No decision is valid unless the ${flavor.object} approves it.`,
    `Every argument must be settled with one ${flavor.snack}.`,
    `The ${authority} meets every 11 minutes and postpones everything.`,
    `Anyone who says "this is normal" becomes temporary chairperson.`,
    `The emergency siren is just somebody loudly saying "${flavor.exclamation}!"`,
    `Every solution must include ${lens.device}.`
  ], seed, 2);
  const recurring = chooseRecurringCharacter(prompt, seed);
  const characterA = recurring.name;
  const characterB = recurring.sidekick;
  const runningGag = recurring.runningGag;
  const catchphrase = recurring.catchphrase;
  return { seed, flavor, tone, lens, recipe, goal, audience, lang, subject, place, authority, sidekick, chaos, secret, rule, recurring, characterA, characterB, runningGag, catchphrase };
}
function makeExplanation(prompt, options, world) {
  const absurdWord = ['slightly', 'properly', 'spectacularly', 'professionally', 'scientifically'][options.absurdity - 1] || 'properly';
  const lensLine = `The comedy lens is ${world.lens.label.toLowerCase()}: ${world.lens.device}.`;
  const detail = options.depth === 'snack'
    ? 'The whole matter lasted five minutes, but everyone acted like it was a national-level seminar.'
    : options.depth === 'deep'
      ? `By afternoon, the ${world.authority} had created subcommittees for snacks, queues, slogans, emergency diagrams, emotional damage, and ${world.lens.conflict}.`
      : options.depth === 'world'
        ? `A new mini-society formed around ${world.secret}, and nobody knew whether to laugh, vote, or submit a form.`
        : `The main problem was ${world.chaos}, but nobody wanted to admit it because the meeting snacks were excellent.`;
  return `${world.lang.prefix}${titleFromPrompt(prompt)} In this ${world.tone.adjective} universe, ${world.subject} became ${absurdWord} official at ${world.place}. ${world.rule} ${lensLine} ${detail} ${world.lang.bridge} Recurring gag: ${world.runningGag}. Content goal: ${world.goal.label.toLowerCase()} — ${world.goal.promise}. Story recipe: ${world.recipe.label.toLowerCase()} — ${world.recipe.hook} ${world.lens.punch} ${world.tone.ending}`;
}
function makeComic(prompt, options, world) {
  const panels = [
    { art: '☁︎  ☕  ?', line: `At ${world.place}, ${world.subject} announced: "From today, ${world.rule}"` },
    { art: '📋  →  😳', line: `${world.authority}: "First submit Form 404: Permission to Be Confused."` },
    { art: '🎤  !!!', line: `${world.sidekick}: "I only came for ${world.flavor.snack}, why am I in charge now?"` },
    { art: '🧪  📈  🌀', line: `A fake expert measured ${world.lens.conflict} and called it "promising early data."` },
    { art: '🏁  ☆  ☂', line: `Final result: ${world.chaos} became official policy.` }
  ];
  if (options.absurdity >= 5) panels[4].line = `Final result: a tiny parade was held for the wrong reason, but attendance was excellent.`;
  return panels;
}
function makeQuotes(prompt, options, world) {
  return [
    `${world.authority}: "Order will be restored after we understand what order means."`,
    `${world.sidekick}: "I support this plan emotionally, not logically."`,
    `Public notice: "Please remain calm. The ${world.flavor.object} is reviewing the situation."`,
    `${world.flavor.exclamation}! "Who approved the ${world.chaos}?"`,
    `${world.subject}: "We are not chaotic. We are creatively governed."`
  ];
}

function makeCharacters(prompt, options, world) {
  return [
    { role: 'Chief Absurdity Officer', name: world.characterA || sentenceCase(world.subject).slice(0, 44), trait: `overconfident about ${world.lens.conflict}`, line: `"${world.catchphrase || 'This is not nonsense. This is structured nonsense.'}"` },
    { role: 'Accidental Hero', name: world.characterB || world.sidekick, trait: `entered for ${world.flavor.snack}, stayed for the drama`, line: `"Please do not make me chairperson again."` },
    { role: 'Authority Figure', name: world.authority, trait: `turns small problems into official systems`, line: `"We need a meeting before the meeting about the meeting."` },
    { role: 'Secret Object', name: world.secret, trait: `quietly controls the plot`, line: `"I know who changed the rules."` }
  ];
}
function makeRules(prompt, options, world) {
  return [
    `Rule 1: ${world.rule}`,
    `Rule 2: Anyone creating ${world.chaos} must bring ${world.flavor.snack} for everyone.`,
    `Rule 3: The ${world.secret} is allowed to interrupt only during serious moments.`,
    `Rule 4: All complaints must be funny, harmless, and less than 30 seconds long.`,
    `Rule 5: If logic fails, the ${world.authority} must blame "experimental imagination conditions".`
  ];
}
function makeStory(prompt, options, world) {
  return [
    `Opening: ${world.recipe.hook} ${world.subject} arrived at ${world.place} with unusual confidence and a suspiciously official expression.`,
    `Beat 1: ${world.chaos} spread after someone trusted ${world.secret} more than common sense.`,
    `Beat 2: ${world.recipe.beat}`,
    `Twist: The ${world.authority} discovered that ${world.lens.conflict} was not a bug; it was the main feature.`,
    `Peak scene: ${world.sidekick} tried to restore order using ${world.flavor.snack}, but accidentally started a public ceremony.`,
    `Ending: ${world.recipe.payoff} ${world.lens.punch} ${world.tone.ending}`
  ];
}
function makeDebate(prompt, options, world) {
  return [
    `Moderator: "Today we ask whether ${world.subject} should be allowed to continue."`,
    `${world.authority}: "Yes, but only after three approvals and one snack audit."`,
    `${world.sidekick}: "No. I have seen the spreadsheet. It has emotions."`,
    `Public witness: "I do not understand the plan, but the poster is excellent."`,
    `Final verdict: Allowed for one more episode, under strict nonsense supervision.`
  ];
}
function makeReport(prompt, options, world) {
  return {
    title: 'Silly Science Bureau Report',
    rows: [
      ['Subject', titleFromPrompt(prompt)],
      ['Hypothesis', `If ${world.subject} controls the situation, ${world.lens.conflict} will rise by at least ${options.absurdity * 17}%.`],
      ['Method', `Observe ${world.place}, interview ${world.sidekick}, and measure reactions near ${world.flavor.snack}.`],
      ['Observation', `${world.subject} showed high confidence, medium logic, and low documentation accuracy.`],
      ['Cause', `${world.chaos} increased after someone introduced ${world.flavor.snack}-based decision making.`],
      ['Secret Variable', `${world.secret} kept affecting results whenever adults looked serious.`],
      ['Risk Level', `${options.absurdity}/5 absurdity units, still family-safe.`],
      ['Conclusion', `The system works only if the ${world.flavor.object} is not given voting rights.`]
    ]
  };
}
function makeNews(prompt, options, world) {
  return {
    headline: `Breaking: ${sentenceCase(world.subject)} triggers ${world.flavor.phrase}`,
    bulletin: `Local witnesses at ${world.place} confirmed that nobody understood the plan, but everyone respected the confidence. The ${world.authority} has promised a clarification after lunch.`,
    ticker: `Ticker: ${world.flavor.snack} demand rises 312% after unusual announcement.`
  };
}
function makeWorld(prompt, options, world) {
  const depthExtra = options.depth === 'deep'
    ? [
        `Economy: ${world.flavor.snack} became a soft currency, but inflation started when somebody brought extra chutney.`,
        `Education: children now study Advanced Queue Theory, Applied Nonsense, and Introduction to ${world.lens.label}.`,
        `Governance: the ${world.authority} created a complaints desk that only accepts compliments.`,
        `Media: every small update becomes breaking news because ${world.lens.conflict} looks dramatic on camera.`,
        `Culture: the annual festival celebrates ${world.secret}, even though nobody knows why.`
      ]
    : options.depth === 'world'
      ? [
          `Local custom: everyone carries a ${world.flavor.object} for emergency decisions.`,
          `Daily problem: ${world.chaos} appears whenever someone says the word "urgent".`,
          `Public belief: ${world.secret} is either a solution, a problem, or the founder.`
        ]
      : [`Daily problem: ${world.chaos} appears whenever someone says the word "urgent".`];
  return [
    `Rule of the world: ${world.rule}`,
    `Main location: ${world.place}.`,
    `Comedy lens: ${world.lens.label} — ${world.lens.device}.`,
    `Story recipe: ${world.recipe.label} — ${world.recipe.shape}.`,
    `Important object: ${world.flavor.object}.`,
    `Secret plot object: ${world.secret}.`,
    `Public mood: confused but entertained.`,
    ...depthExtra,
    `Ending punchline: ${world.tone.ending}`
  ];
}
function makeSequels(prompt, options, world) {
  return [
    `Episode 2: What if ${world.subject} hired consultants to explain ${world.lens.conflict}?`,
    `Episode 3: What if the ${world.flavor.object} leaked the secret minutes?`,
    `Episode 4: What if ${world.sidekick} became the accidental hero?`,
    `Episode 5: What if the ${world.authority} opened a training academy?`,
    `Finale: What if everybody forgot the original problem but kept the ceremony?`
  ];
}
function makeClassroom(prompt, options, world) {
  return [
    `Warm-up question: What is the funniest rule in this world?`,
    `Creative task: Draw ${world.subject} at ${world.place} using only three objects.`,
    `Thinking task: Which real-life system is being gently parodied: traffic, school, market, weather, home, or technology?`,
    `Vocabulary task: Pick three words from the result and create a fun sentence.`,
    `Group task: One group acts as ${world.authority}; another group acts as the confused public.`,
    `Writing task: Add one new rule that makes the world sillier but still safe.`
  ];
}
function makeCaption(prompt, options, world) {
  return `${titleFromPrompt(prompt)}
When ${world.chaos} becomes official policy and everyone says, "Yes, this is process."
Comedy lens: ${world.lens.label}.
Best line: ${world.lens.punch}
#WhatIfMachine #SillyImagination #WonderHub`;
}
function makeShareKit(prompt, options, world) {
  return [
    `WhatsApp line: ${titleFromPrompt(prompt)} ${world.flavor.exclamation}, even the ${world.flavor.object} wanted minutes of meeting.`,
    `Short caption: ${world.subject} + ${world.place} + ${world.lens.label} = ${world.flavor.phrase}.`,
    `Poll: Should the ${world.authority} be allowed to continue? Yes / No / Only after snacks`,
    `Status line: Today’s mood is ${world.chaos} with extra confidence.`,
    `Poster punchline: ${world.rule}`,
    `Reel hook: "Nobody asked for this, but the ${world.authority} approved it."`
  ];
}
function makeNextPrompts(prompt, options, world) {
  return [
    `What if ${world.subject} opened a coaching center?`,
    `What if ${world.flavor.object}s formed a secret union?`,
    `What if ${world.authority} had a WhatsApp group?`,
    `What if ${world.flavor.snack}s became traffic police?`,
    `What if ${world.sidekick}s started a fake science channel?`
  ];
}

function makeJokeMap(prompt, options, world) {
  return [
    `Core absurdity: ${world.subject} behaves as if it has official authority at ${world.place}.`,
    `Comedy engine: ${world.lens.label} using ${world.lens.device}.`,
    `Story recipe: ${world.recipe.label} (${world.recipe.shape}).`,
    `Escalation point: ${world.chaos} becomes public policy instead of being solved quietly.`,
    `Repeatable gag: every sensible question is answered with ${world.flavor.object}, ${world.flavor.snack}, or another committee.`,
    `Punchline type: serious language applied to a silly problem.`
  ];
}
function makeVisualBrief(prompt, options, world) {
  return [
    `Main frame: show ${world.subject} at ${world.place} acting extremely official.`,
    `Hero prop: ${world.flavor.object}; make it look more important than it should be.`,
    `Background gag: a small queue, a confused witness, and one signboard with an unnecessary rule.`,
    `Poster text: ${titleFromPrompt(prompt)}`,
    `Expression guide: everyone is serious except one character who understands the joke.`,
    `Safe visual rule: keep it playful, non-scary, non-political, and child-friendly.`
  ];
}
function makeSeriesBible(prompt, options, world) {
  return [
    `Series title: The ${sentenceCase(world.subject).slice(0, 28)} Files`,
    `Recurring location: ${world.place}.`,
    `Recurring authority: ${world.authority}.`,
    `Running gag: the ${world.secret} interrupts whenever the plot becomes too logical.`,
    `Episode pattern: ${world.recipe.shape}.`,
    `Spin-off idea: ${world.sidekick} opens a help desk for people trapped in ${world.lens.conflict}.`,
    `Season finale: everyone tries to cancel the system, but it wins an award for process excellence.`
  ];
}

function makePromptCoach(prompt, options, world) {
  const tightened = titleFromPrompt(prompt).replace('?', `, but the ${world.flavor.object} is secretly in charge?`);
  return [
    `Best use: ${world.goal.label} — ${world.goal.promise}.`,
    `Current core: ${world.subject} gets authority in ${world.place}.`,
    `Sharpening move: add one specific object, one public rule, and one confused witness.`,
    `Stronger version: ${tightened}`,
    `Avoid: real people, real politics, insults, scary violence, or jokes depending on stereotypes.`,
    `Repeat trick: keep ${world.secret} as the running interruption in every new version.`
  ];
}
function makeLanguageCard(prompt, options, world) {
  const base = titleFromPrompt(prompt);
  return [
    `English: ${base}`,
    `Simple English: What if ${world.subject} made a funny rule at ${world.place}?`,
    `Hinglish-ready: ${world.flavor.exclamation}, ${world.subject} ne ${world.place} mein full ${world.chaos} start kar diya.`,
    `Hindi-friendly structure: short subject + clear place + one funny rule + one harmless punchline.`,
    `Odia-friendly structure: keep sentences short, use familiar objects like ${world.flavor.object}, and avoid heavy idioms.`,
    `Localization note: translate the situation, not every joke word-for-word.`
  ];
}
function makeDirectorNotes(prompt, options, world) {
  return [
    `Opening shot: ${world.place}, everyone standing too seriously around ${world.flavor.object}.`,
    `Hero frame: ${world.subject} appears with more authority than the situation deserves.`,
    `Comic timing: pause after the first official rule; let the witness look confused.`,
    `Background gag: a tiny board says, "${world.rule}"`,
    `Sound idea: one dramatic drum hit whenever ${world.secret} is mentioned.`,
    `Ending frame: the ${world.authority} celebrates even though nobody solved the problem.`
  ];
}
function makeEpisodeKit(prompt, options, world) {
  return [
    `Pilot episode: ${titleFromPrompt(prompt)}`,
    `Episode engine: ${world.recipe.shape}.`,
    `Cold open: ${world.sidekick} notices ${world.chaos} before anyone else.`,
    `Middle beat: the ${world.authority} introduces ${world.lens.device}.`,
    `Recurring gag: ${world.secret} appears exactly when the scene becomes logical.`,
    `Episode ending: ${world.lens.punch}`,
    `Next episode seed: What if ${world.flavor.snack}s started auditing the ${world.authority}?`
  ];
}
function makeChallengeCard(prompt, options, world) {
  return [
    `Challenge: Make this idea 20% funnier without making it mean or unsafe.`,
    `One-minute task: add a new rule for ${world.place}.`,
    `Drawing task: sketch ${world.subject} holding ${world.flavor.object}.`,
    `Group task: Team A defends ${world.rule}; Team B explains why it is unnecessary.`,
    `Writing task: add a new character who misunderstands ${world.secret}.`,
    `Share task: write a one-line poster caption using ${world.flavor.snack}.`
  ];
}
function makeShareVariants(prompt, options, world) {
  return [
    `WhatsApp status: ${world.flavor.exclamation}, ${world.subject} made ${world.chaos} official today.`,
    `Hinglish status: ${world.characterA} ne announce kiya: ${world.catchphrase} Ab public full confused hai.`,
    `Instagram caption: Nobody asked for ${world.subject} at ${world.place}, but the ${world.authority} approved it.`,
    `Poster headline: ${titleFromPrompt(prompt).toUpperCase()}`,
    `Reel opening: "Imagine waking up and finding that ${world.subject} now controls the rules."`,
    `Classroom board line: One absurd idea. One rule. One harmless punchline.`,
    `Family prompt: Ask everyone to add one rule and one witness quote.`
  ];
}
function makeQualityCheck(prompt, options, world) {
  const lengthScore = prompt.length >= 28 && prompt.length <= 120 ? 16 : 11;
  const loopScore = ['posterlab','series','teacher','creator','game','language'].includes(options.outputLoop) ? 16 : 13;
  const specificityScore = /\b(in|inside|during|at|near|on)\b/i.test(prompt) ? 16 : 12;
  const shareScore = options.contentGoal === 'poster' || options.contentGoal === 'creator' ? 17 : 14;
  const replayScore = options.depth === 'deep' || options.contentGoal === 'series' || options.contentGoal === 'game' ? 18 : 14;
  const safetyScore = 18;
  const score = Math.min(100, lengthScore + loopScore + specificityScore + shareScore + replayScore + safetyScore);
  return {
    score,
    rows: [
      ['Clarity', `${lengthScore}/16 — The prompt is ${prompt.length < 28 ? 'short; add subject + place for stronger output' : 'clear enough for fast play'}.`],
      ['Specificity', `${specificityScore}/16 — ${specificityScore === 16 ? 'It has a usable setting or situation.' : 'Add a place like school, market, monsoon, metro, or moon.'}`],
      ['Shareability', `${shareScore}/17 — ${shareScore === 17 ? 'Selected goal supports poster/caption sharing.' : 'Use Poster or Creator loop for sharper share cards.'}`],
      ['Replay value', `${replayScore}/18 — ${replayScore === 18 ? 'Good for series/game/world expansion.' : 'Use Deep World or Series for repeat-session value.'}`],
      ['Safety', `${safetyScore}/18 — Family-safe absurdity path; avoid real-person ridicule and sensitive groups.`],
      ['Polish action', `Best next improvement: ${world.subject} needs one visual object, one rule, and one short punchline.`]
    ]
  };
}


function makeContinuityCard(prompt, options, world) {
  return [
    `Series rule: ${world.rule}`,
    `Recurring location: ${world.place}. Return here whenever the story needs instant familiarity.`,
    `Running gag: ${world.secret} appears in every episode but nobody explains it properly.`,
    `Main conflict: ${world.chaos} returns in a new harmless form each time.`,
    `Tone guardrail: keep it ${world.audience.softness}, silly, non-hurtful, and built around objects/animals/systems rather than real people.`,
    `Episode memory: one witness must always overreact; one quiet object must give the sensible answer.`
  ];
}
function makeAlternateEndings(prompt, options, world) {
  return [
    `Sweet ending: Everyone shares ${world.flavor.snack}, admits the rule was unnecessary, and keeps it anyway for tradition.`,
    `Poster ending: A giant notice appears: “${world.rule}” and the crowd nods as if this explains everything.`,
    `Comic ending: ${world.sidekick} presses one wrong button and accidentally solves ${world.chaos}.`,
    `Series ending: The ${world.authority} closes the case, then discovers ${world.secret} has already started Episode 2.`
  ];
}
function makeMiniGame(prompt, options, world) {
  return [
    `Game name: ${titleFromPrompt(prompt)} — One-Minute Absurdity Round`,
    `Player 1 adds a new rule for ${world.subject}.`,
    `Player 2 adds one witness quote from ${world.place}.`,
    `Player 3 adds one fake scientific measurement for ${world.chaos}.`,
    `Score 1 point for a clean punchline, 1 point for a visual idea, and 1 point for using ${world.flavor.snack} logically.`,
    `Winning condition: the funniest rule that is still safe, simple, and poster-ready wins.`
  ];
}
function makeFormatRouter(prompt, options, world) {
  return [
    `Best for WhatsApp: use Quotes + Share Kit because the premise is instantly understandable.`,
    `Best for poster: use the headline “${titleFromPrompt(prompt)}” with the punchline “${world.lens.punch}”`,
    `Best for classroom: use Joke Map + Mini Game so learners identify cause, rule, consequence, and punchline.`,
    `Best for series: use Series Bible + Continuity because ${world.subject} already has a recurring place, rule, and secret.`,
    `Best for image generation later: use Visual Brief and keep one subject, one location, one action, and no text inside artwork.`
  ];
}
function makeLocalityKit(prompt, options, world) {
  const languageLine = languageDetails[options.language]?.label || 'English';
  return [
    `Language style: ${languageLine}. Keep sentences short and easy to translate.`,
    `Local object swap: replace generic clipboard with ${world.flavor.object}.`,
    `Snack/detail swap: use ${world.flavor.snack} as the harmless comedy anchor.`,
    `Place cue: set the scene at ${world.place} for instant visual clarity.`,
    `Dialogue pattern: one serious official line, one confused public line, one tiny punchline.`,
    `Avoid: real political figures, communities, insults, stereotypes, and unsafe actions.`
  ];
}
function makeAudienceVariants(prompt, options, world) {
  return [
    `Kid version: ${world.subject} made one funny rule, everyone laughed, and nobody got into trouble.`,
    `Family version: ${world.sidekick} tried to help, the family added snacks, and the situation became a dinner-table story.`,
    `Teacher version: Ask learners to identify the impossible idea, the rule, the consequence, and the punchline.`,
    `Creator version: Hook — “Nobody asked for this, but ${world.subject} now has a rulebook.”`,
    `Poster version: One bold title, one character, one rule, one visual joke.`
  ];
}


function makeShowcaseSet(prompt, options, world) {
  const base = titleFromPrompt(prompt);
  return [
    `Demo card: ${base} — ${world.flavor.exclamation}! ${world.rule}`,
    `Comic opener: ${world.subject} enters ${world.place} carrying ${world.flavor.object} like it is official evidence.`,
    `WhatsApp line: Nobody asked, but ${world.subject} now has a ${world.authority} and a snack policy.`,
    `Classroom use: Ask learners to identify the impossible idea, the rule, the consequence, and the punchline.`,
    `Creator use: Convert the debate into a 20-second reel with one narrator, one confused witness, and one final punchline.`,
    `Series hook: Episode 2 starts when ${world.secret} is discovered under the snack table.`
  ];
}
function makePosterBriefs(prompt, options, world) {
  return [
    `Poster 1 — Big headline: “${titleFromPrompt(prompt)}”. Visual: one central ${world.subject} at ${world.place}. Punchline: “${world.rule}”`,
    `Poster 2 — Fake notice: Issued by ${world.authority}. Rule: ${world.rule}. Tiny footer: ${world.lens.punch}`,
    `Poster 3 — Comic cover: ${world.subject} vs ${world.sidekick}. Add a speech bubble: “This is official now.”`,
    `Poster 4 — Lab card: Observation: ${world.chaos}. Test material: ${world.flavor.snack}. Conclusion: more snacks are required.`,
    `Design rule: keep one subject, one place, one action, and no tiny unreadable text inside the artwork.`
  ];
}
function makeLocalizationPack(prompt, options, world) {
  return [
    `English: ${world.subject} created a rule at ${world.place}, and everyone followed it because the notice looked official.`,
    `Simple English: ${world.subject} made a funny rule. People were confused, but it was safe and silly.`,
    `Hinglish: ${world.characterA} ne bola, "${world.catchphrase}" Public confused thi, but scene mast tha.`,
    `Hinglish status: ${world.flavor.exclamation}, ${world.subject} ne ${world.place} mein ${world.chaos} ko official bana diya.`,
    `Hindi-friendly English: Short sentence pattern — subject + funny rule + confused public + clean punchline.`,
    `Odia-friendly English: Use local nouns, short lines, and one clear action so it can be translated naturally later.`,
    `Avoid direct translation of idioms. Replace them with local objects such as ${world.flavor.object}, ${world.flavor.snack}, or ${world.place}.`
  ];
}
function makeSerialArc(prompt, options, world) {
  return [
    `Episode 1: ${world.subject} creates ${world.rule.toLowerCase()} at ${world.place}.`,
    `Episode 2: ${world.sidekick} discovers ${world.secret} and accidentally makes the rule popular.`,
    `Episode 3: ${world.authority} forms a committee and makes the situation more official than required.`,
    `Episode 4: A rival object challenges the rule using ${world.flavor.snack} as evidence.`,
    `Episode 5: The public invents a shortcut, which becomes the new problem.`,
    `Season finale: Everyone solves the chaos by making the smallest, simplest rule possible.`
  ];
}
function makeSessionPlan(prompt, options, world) {
  return [
    `2-minute mode: Read the explanation, pick the funniest rule, and create one alternate rule.`,
    `5-minute family mode: Assign roles — ${world.subject}, ${world.sidekick}, public witness, and serious announcer. Act one comic panel.`,
    `10-minute classroom mode: Identify cause, rule, consequence, and punchline. Then draw a poster without text labels.`,
    `Creator mode: Use the caption, share variants, and poster brief to make one status post and one reel idea.`,
    `Series mode: Save the result, then use Serial Arc and Play Again to create episode 2.`,
    `Quality check: keep it harmless, specific, visual, short enough to share, and easy to remix.`
  ];
}
function makeCreatorCalendar(prompt, options, world) {
  return [
    `Post 1: Share the poster headline with the clean punchline: ${world.rule}`,
    `Post 2: Turn the comic into a 4-shot reel: entry, rule, public confusion, punchline.`,
    `Post 3: Run a poll: “Should ${world.subject} be allowed to run ${world.place}?”`,
    `Post 4: Share three quotes from the characters and ask users to add one more.`,
    `Post 5: Publish the fake report as a carousel: observation, problem, risk, conclusion.`,
    `Post 6: Start a sequel prompt: “What if ${world.subject} faced an inspection tomorrow?”`,
    `Post 7: Compile the best comments into the next episode idea.`
  ];
}
function makeShareLibrary(prompt, options, world) {
  return [
    `Status: ${world.flavor.exclamation}! ${world.subject} made one rule and society immediately overreacted.`,
    `Caption: Nobody planned for ${world.subject} at ${world.place}, but the committee already printed forms.`,
    `One-liner: ${world.lens.punch}`,
    `Question sticker: Would you follow this rule — ${world.rule}?`,
    `Family-safe joke: ${world.sidekick} tried to help and accidentally became assistant commissioner.`,
    `Poster footer: ${world.lens.label} • ${world.flavor.phrase} • What-If Machine`,
    `Sequel seed: Tomorrow, ${world.secret} goes missing.`
  ];
}


function makePunchlineBank(prompt, options, world) {
  return [
    `${world.subject} did not solve the problem; it opened a committee with snacks.`,
    `New rule: nobody may panic until the ${world.flavor.snack} file is stamped twice.`,
    `${world.characterA} called it innovation. ${world.characterB} called it Tuesday.`,
    `The situation became serious when the poster got more followers than the actual plan.`,
    `Official update: the chaos is now organized, but only during tea time.`,
    `Breaking mood: everyone agreed the idea was impossible, then made a WhatsApp group anyway.`,
    `The final decision was postponed because the minutes of the meeting started laughing.`,
    `Public advisory: carry patience, backup snacks, and one extra absurd explanation.`
  ];
}
function makeBestCards(prompt, options, world) {
  return [
    `Poster card: ${titleFromPrompt(prompt)} — ${world.flavor.exclamation}, but make it official.`,
    `WhatsApp card: ${world.characterA} says, "${world.rule}"`,
    `Classroom card: Invent three rules for this world and vote for the funniest one.`,
    `Creator card: Start with a serious voiceover, then reveal the tiny nonsense committee.`,
    `Family card: Ask each person to play one character and add one harmless rule.`,
    `Series card: Episode 1 introduces ${world.characterA}; Episode 2 exposes the snack-based loophole.`
  ];
}
function makeVoiceKit(prompt, options, world) {
  return [
    `${world.characterA}: speaks like a very serious official who has no idea the situation is silly.`,
    `${world.characterB}: asks practical questions and accidentally makes the world funnier.`,
    `Tiny Expert: uses fake technical words like "snack-pressure index" and "umbrella compliance ratio."`,
    `Public Witness: reports the chaos in one sentence, preferably with dramatic understatement.`,
    `Voice rule: keep every line short, concrete, and playable by a child or creator.`,
    `Avoid: sarcasm aimed at real people, adult references, politics, body jokes, or community stereotypes.`
  ];
}
function makePolishPass(prompt, options, world) {
  const goal = contentGoalDetails[options.contentGoal]?.label || 'Casual laugh';
  return [
    `Primary goal: ${goal}. Lead with the clearest joke before expanding the world.`,
    `Make the subject visible: show ${world.subject} doing one impossible but understandable action.`,
    `Add one concrete local object: ${world.flavor.place}, ${world.flavor.snack}, or a tiny official desk.`,
    `Use escalation: normal problem → silly rule → over-serious reaction → clean punchline.`,
    `For sharing, cut the best line to under 14 words and place it on the poster.`,
    `For classroom use, add a harmless question: "What rule would you add?"`,
    `For series use, preserve one running gag: ${world.flavor.snack} approval, missing stamp, or confused assistant.`
  ];
}
function makeContentLadder(prompt, options, world) {
  return [
    `Level 1 — Status line: ${world.subject} created a tiny crisis and called it progress.`,
    `Level 2 — Quote card: "${world.rule}" — ${world.characterA}`,
    `Level 3 — Comic scene: ${world.characterA} announces a rule; ${world.characterB} asks the obvious question.`,
    `Level 4 — Fake report: Measure the chaos with an absurd metric and give one official conclusion.`,
    `Level 5 — Poster: Use one title, one object, one punchline, no paragraph.`,
    `Level 6 — Classroom activity: students add rules, roles, and alternate endings.`,
    `Level 7 — Series: keep the same cast, place, running gag, and escalating tiny bureaucracy.`
  ];
}

function makePoster(prompt, options, world) {
  return {
    style: options.posterStyle,
    kicker: options.posterStyle === 'newspaper' ? 'Absurd Times' : options.posterStyle === 'lab' ? 'Silly Science Bureau' : options.posterStyle === 'comic' ? 'Tiny Comic Cover' : 'What-If Machine',
    title: titleFromPrompt(prompt).toUpperCase(),
    punchline: options.posterStyle === 'lab' ? `Finding: ${world.chaos} increases near ${world.flavor.snack}.` : options.posterStyle === 'newspaper' ? `Officials confirm: ${world.rule}` : `${world.flavor.exclamation}! ${world.rule}`,
    footer: `${world.lens.label} • ${languageDetails[options.language]?.suffix || 'Play mode'} • v${APP_VERSION}`
  };
}
function generateResult(rawPrompt, overrideOptions = {}) {
  const normalized = normalizePrompt(rawPrompt);
  const safe = safePrompt(normalized);
  const prompt = safe.prompt;
  const options = getSelectedOptions(overrideOptions);
  const world = buildCoreWorld(prompt, options);
  const content = {
    explanation: makeExplanation(prompt, options, world),
    characters: makeCharacters(prompt, options, world),
    rules: makeRules(prompt, options, world),
    comic: makeComic(prompt, options, world),
    story: makeStory(prompt, options, world),
    debate: makeDebate(prompt, options, world),
    jokemap: makeJokeMap(prompt, options, world),
    showcase: makeShowcaseSet(prompt, options, world),
    visualbrief: makeVisualBrief(prompt, options, world),
    posterbriefs: makePosterBriefs(prompt, options, world),
    seriesbible: makeSeriesBible(prompt, options, world),
    serialarc: makeSerialArc(prompt, options, world),
    sessionplan: makeSessionPlan(prompt, options, world),
    creatorcalendar: makeCreatorCalendar(prompt, options, world),
    localizationpack: makeLocalizationPack(prompt, options, world),
    sharelibrary: makeShareLibrary(prompt, options, world),
    continuity: makeContinuityCard(prompt, options, world),
    alternateendings: makeAlternateEndings(prompt, options, world),
    minigame: makeMiniGame(prompt, options, world),
    formatrouter: makeFormatRouter(prompt, options, world),
    localitykit: makeLocalityKit(prompt, options, world),
    audiencevariants: makeAudienceVariants(prompt, options, world),
    promptcoach: makePromptCoach(prompt, options, world),
    languagecard: makeLanguageCard(prompt, options, world),
    director: makeDirectorNotes(prompt, options, world),
    episodekit: makeEpisodeKit(prompt, options, world),
    challengecard: makeChallengeCard(prompt, options, world),
    sharevariants: makeShareVariants(prompt, options, world),
    punchlinebank: makePunchlineBank(prompt, options, world),
    bestcards: makeBestCards(prompt, options, world),
    voicekit: makeVoiceKit(prompt, options, world),
    polishpass: makePolishPass(prompt, options, world),
    contentladder: makeContentLadder(prompt, options, world),
    quality: makeQualityCheck(prompt, options, world),
    quotes: makeQuotes(prompt, options, world),
    report: makeReport(prompt, options, world),
    news: makeNews(prompt, options, world),
    world: makeWorld(prompt, options, world),
    sequel: makeSequels(prompt, options, world),
    classroom: makeClassroom(prompt, options, world),
    caption: makeCaption(prompt, options, world),
    sharekit: makeShareKit(prompt, options, world),
    next: makeNextPrompts(prompt, options, world),
    poster: makePoster(prompt, options, world)
  };
  return { id: `wif-${Date.now()}-${Math.floor(Math.random() * 1000)}`, version: APP_VERSION, createdAt: new Date().toISOString(), prompt, originalPrompt: normalized, redirected: safe.redirected, options, content };
}
function htmlList(items) {
  return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}
function panelHtml(key, value, result) {
  if (key === 'explanation') return `<p>${escapeHtml(value)}</p>`;
  if (key === 'comic') return `<div class="comic-grid">${value.map((panel, index) => `<div class="comic-panel"><strong>Panel ${index + 1}</strong><div class="comic-art">${escapeHtml(panel.art)}</div><p>${escapeHtml(panel.line)}</p></div>`).join('')}</div>`;
  if (key === 'characters') return `<div class="character-grid">${value.map(item => `<article class="character-card"><strong>${escapeHtml(item.role)}</strong><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.trait)}</p><blockquote>${escapeHtml(item.line)}</blockquote></article>`).join('')}</div>`;
  if (key === 'rules') return `<div class="rule-stack">${value.map(item => `<div class="rule-card">${escapeHtml(item)}</div>`).join('')}</div>`;
  if (key === 'story') return `<ol class="story-beats">${value.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;
  if (key === 'debate') return `<div class="debate-box">${value.map(item => `<p>${escapeHtml(item)}</p>`).join('')}</div>`;
  if (key === 'jokemap' || key === 'showcase' || key === 'visualbrief' || key === 'posterbriefs' || key === 'seriesbible' || key === 'serialarc' || key === 'sessionplan' || key === 'creatorcalendar' || key === 'localizationpack' || key === 'sharelibrary' || key === 'continuity' || key === 'alternateendings' || key === 'minigame' || key === 'formatrouter' || key === 'localitykit' || key === 'audiencevariants' || key === 'promptcoach' || key === 'languagecard' || key === 'director' || key === 'episodekit' || key === 'challengecard' || key === 'sharevariants' || key === 'punchlinebank' || key === 'bestcards' || key === 'voicekit' || key === 'polishpass' || key === 'contentladder' || key === 'quotes' || key === 'world' || key === 'sequel' || key === 'classroom' || key === 'sharekit') return htmlList(value);
  if (key === 'quality') return `<div class="quality-card"><strong>${escapeHtml(value.score)}/100 content readiness</strong><ul>${value.rows.map(row => `<li><strong>${escapeHtml(row[0])}:</strong> ${escapeHtml(row[1])}</li>`).join('')}</ul></div>`;
  if (key === 'report') return `<h3>${escapeHtml(value.title)}</h3><ul>${value.rows.map(row => `<li><strong>${escapeHtml(row[0])}:</strong> ${escapeHtml(row[1])}</li>`).join('')}</ul>`;
  if (key === 'news') return `<h3>${escapeHtml(value.headline)}</h3><p>${escapeHtml(value.bulletin)}</p><p><strong>${escapeHtml(value.ticker)}</strong></p>`;
  if (key === 'caption') return `<p>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`;
  if (key === 'poster') return posterHtml(value);
  if (key === 'next') return `<div class="sparks-grid">${value.map(prompt => `<button class="spark-button" type="button" data-next-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join('')}</div>`;
  return `<p>${escapeHtml(String(value))}</p>`;
}
function posterHtml(poster) {
  return `<div class="poster-card ${escapeHtml(poster.style)}"><div><p class="poster-kicker">${escapeHtml(poster.kicker)}</p><h3 class="poster-title">${escapeHtml(poster.title)}</h3></div><p class="poster-punchline">${escapeHtml(poster.punchline)}</p><div class="poster-footer"><span>Shareable Card</span><span>${escapeHtml(poster.footer)}</span></div></div>`;
}
function tabsForResult(result) {
  const preset = loopPresets[result.options.outputLoop] || loopPresets.full;
  return preset.tabs;
}
function renderResult(result, prepend = true) {
  const stack = $('#resultStack');
  const tabs = tabsForResult(result);
  const card = document.createElement('article');
  card.className = 'machine-result';
  card.dataset.resultId = result.id;
  const safeNote = result.redirected ? `<div class="safe-note">Prompt redirected into harmless absurdity. The app avoids harmful, hateful, explicit, or real-political content.</div>` : '';
  card.innerHTML = `
    ${safeNote}
    <div class="result-head">
      <div>
        <p class="eyebrow">${escapeHtml(loopPresets[result.options.outputLoop]?.label || 'Full Mix')}</p>
        <h2 class="result-title">${escapeHtml(titleFromPrompt(result.prompt))}</h2>
        <p class="result-meta">${escapeHtml(result.options.language)} • ${escapeHtml(result.options.flavor)} • ${escapeHtml(result.options.storyRecipe || 'escalation')} • ${escapeHtml(result.options.contentGoal || 'laugh')} • absurdity ${result.options.absurdity}/5 • ${new Date(result.createdAt).toLocaleString()}</p>
      </div>
    </div>
    <div class="quick-actions">
      <button class="pill-action" type="button" data-action="save">Save</button>
      <button class="pill-action" type="button" data-action="copy">Copy</button>
      <button class="pill-action" type="button" data-action="share">Share</button>
      <button class="pill-action" type="button" data-action="poster">Download Poster</button>
      <button class="pill-action" type="button" data-action="again">Play Again</button>
    </div>
    <div class="mode-tabs" role="tablist">${tabs.map((tab, i) => `<button class="mode-tab ${i === 0 ? 'active' : ''}" type="button" data-tab="${tab}">${tabLabels[tab] || tab}</button>`).join('')}</div>
    <div class="mode-panels">${tabs.map((tab, i) => `<section class="mode-panel ${i === 0 ? 'active' : ''}" data-panel="${tab}">${panelHtml(tab, result.content[tab], result)}</section>`).join('')}</div>
  `;
  bindResultCard(card, result);
  if (prepend) stack.prepend(card); else stack.appendChild(card);
  stack.scrollIntoView({ block: 'start', behavior: 'smooth' });
}
function resultToText(result) {
  const parts = [
    titleFromPrompt(result.prompt),
    '',
    result.content.explanation,
    '',
    'Characters:',
    ...(result.content.characters || []).map(item => `- ${item.role}: ${item.name} — ${item.line}`),
    '',
    'World Rules:',
    ...(result.content.rules || []).map(line => `- ${line}`),
    '',
    'Tiny Story:',
    ...(result.content.story || []).map(line => `- ${line}`),
    '',
    'Joke Map:',
    ...(result.content.jokemap || []).map(line => `- ${line}`),
    '',
    'Showcase:',
    ...(result.content.showcase || []).map(line => `- ${line}`),
    '',
    'Poster Briefs:',
    ...(result.content.posterbriefs || []).map(line => `- ${line}`),
    '',
    'Serial Arc:',
    ...(result.content.serialarc || []).map(line => `- ${line}`),
    '',
    'Session Plan:',
    ...(result.content.sessionplan || []).map(line => `- ${line}`),
    '',
    'Share Library:',
    ...(result.content.sharelibrary || []).map(line => `- ${line}`),
    '',
    'Visual Brief:',
    ...(result.content.visualbrief || []).map(line => `- ${line}`),
    '',
    'Continuity:',
    ...(result.content.continuity || []).map(line => `- ${line}`),
    '',
    'Alternate Endings:',
    ...(result.content.alternateendings || []).map(line => `- ${line}`),
    '',
    'Mini Game:',
    ...(result.content.minigame || []).map(line => `- ${line}`),
    '',
    'Prompt Coach',
    ...(result.content.promptcoach || []).map(line => `- ${line}`),
    '',
    'Share Variants',
    ...(result.content.sharevariants || []).map(line => `- ${line}`),
    '',
    'Punchlines:',
    ...(result.content.punchlinebank || []).map(line => `- ${line}`),
    '',
    'Best Cards:',
    ...(result.content.bestcards || []).map(line => `- ${line}`),
    '',
    'Voice Kit:',
    ...(result.content.voicekit || []).map(line => `- ${line}`),
    '',
    'Polish Pass:',
    ...(result.content.polishpass || []).map(line => `- ${line}`),
    '',
    'Quotes:',
    ...result.content.quotes.map(line => `- ${line}`),
    '',
    'Share Kit:',
    ...result.content.sharekit.map(line => `- ${line}`)
  ];
  return parts.join('\n');
}
function bindResultCard(card, result) {
  $all('.mode-tab', card).forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      $all('.mode-tab', card).forEach(item => item.classList.toggle('active', item === button));
      $all('.mode-panel', card).forEach(panel => panel.classList.toggle('active', panel.dataset.panel === tab));
    });
  });
  $all('[data-action]', card).forEach(button => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      if (action === 'save') saveResult(result);
      if (action === 'copy') copyText(resultToText(result));
      if (action === 'share') shareResult(result);
      if (action === 'poster') downloadPosterSvg(result.content.poster);
      if (action === 'again') {
        const next = pick(result.content.next, Date.now(), Math.floor(Math.random() * 9));
        $('#promptInput').value = next;
        const again = generateResult(next);
        state.latestGenerated = again;
        $('#remixStatus').textContent = `Latest result ready: ${again.prompt}`;
        renderResult(again, true);
      }
    });
  });
  $all('[data-next-prompt]', card).forEach(button => {
    button.addEventListener('click', () => {
      const prompt = button.dataset.nextPrompt;
      $('#promptInput').value = prompt;
      const next = generateResult(prompt);
      state.latestGenerated = next;
      $('#remixStatus').textContent = `Latest result ready: ${next.prompt}`;
      renderResult(next, true);
    });
  });
}
function getGallery() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function setGallery(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 80)));
}
function saveResult(result) {
  const gallery = getGallery().filter(item => item.id !== result.id);
  gallery.unshift(result);
  setGallery(gallery);
  renderGallery();
  toast('Saved locally');
}
function renderGallery() {
  const list = $('#galleryList');
  const empty = $('#emptyGallery');
  const query = normalizePrompt($('#gallerySearch')?.value || '').toLowerCase();
  const gallery = getGallery().filter(item => !query || item.prompt.toLowerCase().includes(query) || resultToText(item).toLowerCase().includes(query));
  list.innerHTML = '';
  empty.style.display = gallery.length ? 'none' : 'block';
  gallery.forEach(item => {
    const card = document.createElement('article');
    card.className = 'gallery-card';
    card.innerHTML = `
      <p class="eyebrow">${escapeHtml(item.options?.outputLoop || 'saved')}</p>
      <h3>${escapeHtml(titleFromPrompt(item.prompt))}</h3>
      <p>${escapeHtml(item.content?.explanation || '').slice(0, 180)}...</p>
      <div class="gallery-actions">
        <button class="pill-action" type="button" data-gallery-action="open">Open</button>
        <button class="pill-action" type="button" data-gallery-action="copy">Copy</button>
        <button class="pill-action" type="button" data-gallery-action="delete">Delete</button>
      </div>
    `;
    card.querySelector('[data-gallery-action="open"]').addEventListener('click', () => { switchView('create'); renderResult(item, true); });
    card.querySelector('[data-gallery-action="copy"]').addEventListener('click', () => copyText(resultToText(item)));
    card.querySelector('[data-gallery-action="delete"]').addEventListener('click', () => { setGallery(getGallery().filter(saved => saved.id !== item.id)); renderGallery(); toast('Deleted'); });
    list.appendChild(card);
  });
}
function exportGallery() {
  const blob = new Blob([JSON.stringify({ app: 'What-If Machine', version: APP_VERSION, exportedAt: new Date().toISOString(), items: getGallery() }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `what-if-machine-gallery-v${APP_VERSION}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Gallery exported');
}
function importGallery(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const incoming = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(incoming)) throw new Error('Invalid gallery file');
      const merged = [...incoming, ...getGallery()].filter(item => item && item.prompt && item.content);
      const unique = Array.from(new Map(merged.map(item => [item.id || `${item.prompt}-${item.createdAt}`, item])).values());
      setGallery(unique);
      renderGallery();
      toast('Gallery imported');
    } catch {
      toast('Import failed');
    }
  };
  reader.readAsText(file);
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied');
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    toast('Copied');
  }
}
async function shareResult(result) {
  const text = resultToText(result);
  if (navigator.share) {
    try { await navigator.share({ title: titleFromPrompt(result.prompt), text }); toast('Shared'); return; } catch { /* user cancelled */ }
  }
  copyText(text);
}
function svgLineBreaks(text, maxChars = 20) {
  const words = String(text).split(' ');
  const lines = [];
  let current = '';
  words.forEach(word => {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current.trim()) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 8);
}
function downloadPosterSvg(poster) {
  const titleLines = svgLineBreaks(poster.title, 18);
  const punchLines = svgLineBreaks(poster.punchline, 25);
  const titleSvg = titleLines.map((line, i) => `<text x="60" y="${190 + i * 58}" font-size="50" font-weight="900" letter-spacing="-2">${escapeHtml(line)}</text>`).join('');
  const punchSvg = punchLines.map((line, i) => `<text x="60" y="${760 + i * 36}" font-size="30" font-weight="800">${escapeHtml(line)}</text>`).join('');
  const bg = poster.style === 'newspaper'
    ? '<rect width="1080" height="1920" rx="72" fill="#fff8ec"/><g opacity="0.22" stroke="#171423">' + Array.from({ length: 40 }, (_, i) => `<line x1="60" x2="1020" y1="${180 + i * 38}" y2="${180 + i * 38}"/>`).join('') + '</g>'
    : poster.style === 'lab'
      ? '<rect width="1080" height="1920" rx="72" fill="#dffbff"/><rect x="46" y="46" width="988" height="1828" rx="52" fill="none" stroke="#171423" stroke-width="10" stroke-dasharray="24 18"/>'
      : poster.style === 'comic'
        ? '<rect width="1080" height="1920" rx="72" fill="#ffd166"/><g opacity="0.35">' + Array.from({ length: 38 }, (_, i) => `<rect x="-120" y="${i * 58}" width="1350" height="28" transform="rotate(-10 540 960)" fill="#ffb703"/>`).join('') + '</g><rect x="46" y="46" width="988" height="1828" rx="52" fill="none" stroke="#171423" stroke-width="12"/>'
        : '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd166"/><stop offset="0.55" stop-color="#ff8fab"/><stop offset="1" stop-color="#9bf6ff"/></linearGradient></defs><rect width="1080" height="1920" rx="72" fill="url(#g)"/><circle cx="170" cy="160" r="180" fill="#ffffff" opacity="0.34"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">${bg}<text x="60" y="95" font-size="32" font-weight="900" letter-spacing="6" fill="#171423">${escapeHtml(poster.kicker)}</text><g fill="#171423">${titleSvg}</g><g fill="#171423">${punchSvg}</g><text x="60" y="1808" font-size="26" font-weight="900" fill="#171423">Shareable Card</text><text x="60" y="1850" font-size="24" font-weight="800" fill="#171423">${escapeHtml(poster.footer)}</text></svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `what-if-machine-${poster.style}-poster.svg`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Poster downloaded');
}
function renderPromptBuilder() {
  Object.entries(promptBuilder).forEach(([key, values]) => {
    const container = $(`#builder${key.charAt(0).toUpperCase() + key.slice(1)}`);
    container.innerHTML = '';
    values.forEach(value => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `builder-chip ${builderState[key] === value ? 'active' : ''}`;
      button.textContent = value;
      button.addEventListener('click', () => { builderState[key] = value; renderPromptBuilder(); });
      container.appendChild(button);
    });
  });
}
function renderStarterChips() {
  const row = $('#starterChips');
  row.innerHTML = '';
  starterPrompts.slice(0, 24).forEach(prompt => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = prompt;
    chip.addEventListener('click', () => { $('#promptInput').value = prompt; $('#promptInput').focus(); });
    row.appendChild(chip);
  });
}

function renderShowcaseExamples() {
  const grid = $('#showcaseGrid');
  if (!grid) return;
  grid.innerHTML = '';
  curatedShowcases.forEach(item => {
    const card = document.createElement('article');
    card.className = 'showcase-example-card';
    card.innerHTML = `<p class="eyebrow">${escapeHtml(item.title)}</p><h3>${escapeHtml(item.prompt)}</h3><p>${escapeHtml(item.tag)}</p><button class="secondary-button full-width" type="button">Run showcase</button>`;
    $('button', card).addEventListener('click', () => {
      syncControls(item.options || {});
      $('#promptInput').value = item.prompt;
      switchView('create');
      runPrompt(item.prompt, item.options || {});
    });
    grid.appendChild(card);
  });
}

function renderPacks() {
  const grid = $('#packGrid');
  grid.innerHTML = '';
  promptPacks.forEach(pack => {
    const card = document.createElement('article');
    card.className = 'pack-card';
    card.innerHTML = `<h3>${escapeHtml(pack.title)}</h3><p>${escapeHtml(pack.description)}</p><p class="pack-count">${pack.prompts.length} curated what-if sparks</p><div class="pack-prompts"></div>`;
    const prompts = $('.pack-prompts', card);
    pack.prompts.forEach(prompt => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'prompt-tile';
      tile.textContent = prompt;
      tile.addEventListener('click', () => {
        $('#promptInput').value = prompt;
        switchView('create');
        runPrompt(prompt);
      });
      prompts.appendChild(tile);
    });
    grid.appendChild(card);
  });
}
function renderDailyChallenge(seed = new Date().toISOString().slice(0, 10)) {
  const daySeed = hashText(String(seed));
  const prompt = pick(starterPrompts, daySeed, 2);
  const hint = pick([
    'Try it in fake science mode.',
    'Turn it into a WhatsApp share card.',
    'Make it classroom-safe and ask students to add a rule.',
    'Generate a comic cover poster.',
    'Save the best version to your local gallery.'
  ], daySeed, 3);
  $('#dailyPrompt').textContent = prompt;
  $('#dailyHint').textContent = hint;
  return prompt;
}
function randomPrompt() {
  const prompt = pick(starterPrompts, Date.now(), Math.floor(Math.random() * 11));
  $('#promptInput').value = prompt;
  return prompt;
}
function runPrompt(prompt, override = {}) {
  const result = generateResult(prompt, override);
  state.latestGenerated = result;
  $('#remixStatus').textContent = `Latest result ready: ${result.prompt}`;
  renderResult(result, true);
  return result;
}
function switchView(viewName) {
  $all('.view').forEach(view => view.classList.toggle('active', view.id === `view-${viewName}`));
  $all('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === viewName));
  $('#appMain').scrollTo({ top: 0, behavior: 'smooth' });
}
function toast(message) {
  let node = $('.toast');
  if (!node) {
    node = document.createElement('div');
    node.className = 'toast';
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove('show'), 1500);
}
function showOnboarding(force = false) {
  if (!force && localStorage.getItem(ONBOARDING_KEY) === 'seen') return;
  $('#onboardingModal').classList.add('show');
  $('#onboardingModal').setAttribute('aria-hidden', 'false');
}
function hideOnboarding() {
  $('#onboardingModal').classList.remove('show');
  $('#onboardingModal').setAttribute('aria-hidden', 'true');
  localStorage.setItem(ONBOARDING_KEY, 'seen');
}
function installServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light') document.documentElement.dataset.theme = 'light';
  $('#themeToggle').textContent = saved === 'light' ? '☀' : '☾';
}
function bindEvents() {
  $('#whatIfForm').addEventListener('submit', event => {
    event.preventDefault();
    const prompt = normalizePrompt($('#promptInput').value);
    if (!prompt) return;
    runPrompt(prompt);
  });
  $('#randomPromptBtn').addEventListener('click', () => runPrompt(randomPrompt()));
  $('#quickPlayBtn').addEventListener('click', () => runPrompt(randomPrompt()));
  $('#clearPromptBtn').addEventListener('click', () => { $('#promptInput').value = ''; $('#promptInput').focus(); });
  $('#buildPromptBtn').addEventListener('click', () => {
    const prompt = buildPromptFromParts();
    $('#promptInput').value = prompt;
    runPrompt(prompt);
  });
  $('#resetBuilderBtn').addEventListener('click', () => {
    builderState = { subject: promptBuilder.subject[0], action: promptBuilder.action[0], place: promptBuilder.place[0] };
    renderPromptBuilder();
    toast('Builder reset');
  });
  $('#useDailyBtn').addEventListener('click', () => {
    const prompt = $('#dailyPrompt').textContent;
    $('#promptInput').value = prompt;
    switchView('create');
    runPrompt(prompt);
  });
  $('#shuffleDailyBtn').addEventListener('click', () => { renderDailyChallenge(Date.now()); toast('Challenge shuffled'); });
  $('#absurdityRange').addEventListener('input', event => { $('#absurdityValue').textContent = event.target.value; });
  $all('.loop-btn').forEach(button => {
    button.addEventListener('click', () => {
      state.outputLoop = button.dataset.loop || 'full';
      $all('.loop-btn').forEach(item => item.classList.toggle('active', item === button));
      if (state.outputLoop === 'teacher') syncControls({ audience: 'teacher', tone: 'school', depth: 'world' });
      if (state.outputLoop === 'creator') syncControls({ audience: 'creator', depth: 'scene' });
      if (state.outputLoop === 'deep') syncControls({ depth: 'deep', absurdity: 5 });
      if (state.outputLoop === 'series') syncControls({ contentGoal: 'series', depth: 'deep', storyRecipe: 'quest', absurdity: 5 });
      if (state.outputLoop === 'posterlab') syncControls({ contentGoal: 'poster', outputLoop: 'posterlab', posterStyle: 'comic', depth: 'world' });
      toast(`${loopPresets[state.outputLoop]?.label || 'Full Mix'} selected`);
    });
  });
  $all('.segment').forEach(button => {
    button.addEventListener('click', () => { state.audience = button.dataset.audience; $all('.segment').forEach(item => item.classList.toggle('active', item === button)); });
  });
  $all('.nav-item').forEach(item => item.addEventListener('click', () => switchView(item.dataset.view)));
  $all('.remix-lab-btn').forEach(button => {
    button.addEventListener('click', () => {
      if (!state.latestGenerated) { toast('Generate first'); switchView('create'); return; }
      const type = button.dataset.remix;
      const map = {
        absurd: { absurdity: Math.min(5, Number(state.latestGenerated.options.absurdity || 4) + 1) },
        deep: { depth: 'deep', outputLoop: 'deep', absurdity: 5 },
        bengaluru: { flavor: 'bengaluru' },
        hinglish: { language: 'hinglish' },
        odia: { language: 'odia-lite' },
        teacher: { audience: 'teacher', tone: 'school', depth: 'world', outputLoop: 'teacher' },
        creator: { audience: 'creator', depth: 'scene', outputLoop: 'creator' },
        sequel: { outputLoop: 'deep', depth: 'deep', absurdity: 5 },
        newspaper: { posterStyle: 'newspaper' },
        comicPoster: { posterStyle: 'comic', outputLoop: 'comic' },
        scienceLens: { lens: 'science', tone: 'science' },
        startupLens: { lens: 'startup', outputLoop: 'creator' },
        cinemaLens: { lens: 'cinema', tone: 'dramatic' },
        mysteryRecipe: { storyRecipe: 'mystery', depth: 'deep' },
        mockumentaryRecipe: { storyRecipe: 'mockumentary', outputLoop: 'creator' },
        visualBrief: { outputLoop: 'creator', depth: 'world' },
        seriesStudio: { outputLoop: 'series', contentGoal: 'series', depth: 'deep', storyRecipe: 'quest', absurdity: 5 },
        posterStudio: { outputLoop: 'posterlab', contentGoal: 'poster', posterStyle: 'comic', depth: 'world' },
        familyStory: { contentGoal: 'family', audience: 'family', tone: 'clean', storyRecipe: 'quest', outputLoop: 'deep' },
        classChallenge: { contentGoal: 'classroom', audience: 'teacher', tone: 'school', outputLoop: 'teacher', depth: 'world' },
        languageLab: { outputLoop: 'language', contentGoal: 'language', language: 'simple', depth: 'scene' },
        groupGame: { outputLoop: 'game', contentGoal: 'game', storyRecipe: 'rivalry', absurdity: 5 },
        continuityPass: { outputLoop: 'series', contentGoal: 'world', depth: 'deep', storyRecipe: 'quest' },
        altEndings: { outputLoop: 'comic', depth: 'world', absurdity: 5 }
      };
      const override = map[type] || {};
      syncControls(override);
      switchView('create');
      runPrompt(state.latestGenerated.prompt, override);
    });
  });
  $('#clearGalleryBtn').addEventListener('click', () => { setGallery([]); renderGallery(); toast('Gallery cleared'); });
  $('#exportGalleryBtn').addEventListener('click', exportGallery);
  $('#importGalleryInput').addEventListener('change', event => importGallery(event.target.files[0]));
  $('#gallerySearch').addEventListener('input', renderGallery);
  $('#themeToggle').addEventListener('click', () => {
    const isLight = document.documentElement.dataset.theme === 'light';
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, 'dark');
      $('#themeToggle').textContent = '☾';
    } else {
      document.documentElement.dataset.theme = 'light';
      localStorage.setItem(THEME_KEY, 'light');
      $('#themeToggle').textContent = '☀';
    }
  });
  $('#openOnboardingBtn').addEventListener('click', () => showOnboarding(true));
  $('#closeOnboardingBtn').addEventListener('click', hideOnboarding);
  $('#startPlayingBtn').addEventListener('click', hideOnboarding);
  $('#onboardingModal').addEventListener('click', event => { if (event.target.id === 'onboardingModal') hideOnboarding(); });
}
function boot() {
  initTheme();
  renderPromptBuilder();
  renderStarterChips();
  renderDailyChallenge();
  renderShowcaseExamples();
  renderPacks();
  renderGallery();
  bindEvents();
  installServiceWorker();
  showOnboarding(false);
}
window.addEventListener('DOMContentLoaded', boot);
