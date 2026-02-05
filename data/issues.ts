/**
 * Civic issues data
 * Each issue contains an id, title, description, and message paragraph.
 */

export interface Issue {
  id: string;
  title: string;
  description: string;
  messageParagraph: string;
}

export const issues: Issue[] = [
  {
    id: 'universal-healthcare',
    title: 'Universal Healthcare (Medicare for All)',
    description: 'Healthcare as a human right, not a commodity',
    messageParagraph:
      'People are dying right now. Not from rare diseases, but from rationing insulin, skipping screenings, and avoiding emergency rooms because they cannot afford the bill. This is not a policy debate; it is an ongoing, preventable catastrophe. I demand that you support universal, single-payer healthcare that covers every person in this country without exception. Every month you delay, people lose their lives to a system designed to extract profit from suffering. The for-profit insurance model is killing your constituents. Act now.',
  },
  {
    id: 'climate-justice',
    title: 'Climate Justice & Green New Deal',
    description: 'Climate action centered on people, not corporations',
    messageParagraph:
      'We are running out of time. Record wildfires, collapsing ecosystems, deadly heat waves, and catastrophic floods are no longer projections. They are the daily reality for millions of people, and it is getting worse every year. Fossil fuel companies have known about this for decades and chose profit over survival. I demand that you treat this as the emergency it is: support a Green New Deal that rapidly ends fossil fuel extraction, invests in publicly owned renewable energy, and guarantees that frontline communities and displaced workers are protected. Half-measures and distant targets are a death sentence. The window for meaningful action is closing.',
  },
  {
    id: 'police-violence',
    title: 'End Police Violence & Mass Incarceration',
    description: 'Accountability, decarceration, and community safety',
    messageParagraph:
      'Black and brown people are being killed, brutalized, and locked in cages at staggering rates, and the systems responsible face almost no accountability. This is not a matter of a few bad actors. It is structural violence embedded in law and policy. I demand that you act immediately to end qualified immunity, drastically reduce incarceration, and redirect public safety funding into housing, mental health services, education, and community-led programs that actually prevent harm. Every day this system continues unchecked, more lives are destroyed. Your silence is complicity.',
  },
  {
    id: 'trans-rights',
    title: 'Protect Transgender People and Trans Youth',
    description: 'Oppose state-sponsored attacks on trans lives',
    messageParagraph:
      'Trans people, especially trans kids, are under direct, coordinated political assault right now. Legislatures across the country are stripping away their healthcare, banning them from public life, and using them as scapegoats to consolidate power. This is not an abstract culture war. It is state-sponsored cruelty that is driving real people to despair and death. I demand that you forcefully oppose every piece of legislation that restricts gender-affirming care, erases trans people from public spaces, or enables discrimination against them. Lives depend on your willingness to act, not equivocate.',
  },
  {
    id: 'immigration-abolish-ice',
    title: 'End ICE Abuses & Protect Immigrants',
    description: 'Human rights over detention and deportation',
    messageParagraph:
      'Right now, people, including children, are locked in detention facilities in inhumane conditions. Families are being torn apart by a system built on cruelty and dehumanization. ICE operates with almost no oversight, and the human cost is catastrophic. I demand that you act to drastically reduce detention, end the abusive enforcement machine, protect every asylum seeker\'s legal rights, and create a path to permanent legal status for undocumented people who are part of this country. This is a human rights emergency happening on our soil, and delay is unacceptable.',
  },
  {
    id: 'workers-rights',
    title: 'Workers\u2019 Rights & Union Power',
    description: 'Collective bargaining and workplace democracy',
    messageParagraph:
      'Corporate profits have hit record highs while workers are ground down by poverty wages, wage theft, unsafe conditions, and union-busting. This is not an accident. It is the result of decades of deliberate policy choices that have stripped working people of power. I demand that you act now to protect and expand the right to organize, pass legislation that strengthens unions, raise the minimum wage to a true living wage, and hold corporations accountable for the exploitation they profit from. Workers built this economy and they deserve power over their own labor. Stop siding with the corporations destroying their lives.',
  },
  {
    id: 'housing-as-a-right',
    title: 'Housing as a Human Right',
    description: 'Decommodify housing and end homelessness',
    messageParagraph:
      'People are sleeping on sidewalks, families are one paycheck from eviction, and corporate landlords are hoarding housing as a speculative asset. All of this is happening in one of the wealthiest nations in human history. This is a policy choice, not an inevitability. I demand that you support massive investment in social and public housing, enforceable tenant protections, rent stabilization, and aggressive action against real estate speculation. Every night someone sleeps outside while apartments sit empty is a moral indictment of our priorities. This crisis demands emergency-level action now.',
  },
  {
    id: 'student-debt',
    title: 'Cancel Student Debt & Fund Public Education',
    description: 'Education without lifelong debt',
    messageParagraph:
      'An entire generation has been shackled with crushing, inescapable debt for the act of pursuing an education. That debt delays homeownership, prevents family planning, and drives people into financial ruin. This was a deliberate policy choice, and it can be undone. I demand that you support the full cancellation of federal student debt immediately and fund tuition-free public higher education so no one else is trapped by this system. The longer you wait, the deeper the damage. People cannot afford your inaction.',
  },
  {
    id: 'voting-rights-democracy',
    title: 'Expand Voting Rights & Democratic Participation',
    description: 'Democracy without barriers',
    messageParagraph:
      'Democracy itself is being dismantled. Voter suppression laws, extreme gerrymandering, and the flood of dark money into politics are systematically silencing the will of the people. If you believe in representative government at all, you must act now to support automatic voter registration, expanded early and mail-in voting, an end to partisan gerrymandering, and meaningful campaign finance reform. Every election cycle that passes without action further entrenches minority rule. The legitimacy of our entire democratic system is at stake.',
  },
  {
    id: 'foreign-policy',
    title: 'End Endless War & Military Overspending',
    description: 'Diplomacy over militarism',
    messageParagraph:
      'Hundreds of billions of dollars are poured into the military every year while people in this country go without healthcare, housing, and clean water. This spending does not make us safer. It fuels endless wars, destabilizes entire regions, and enriches defense contractors at the direct expense of human needs. I demand that you oppose further military escalation, fight to substantially reduce the Pentagon budget, and redirect those resources toward the crises actually killing your constituents: poverty, climate collapse, and a gutted social safety net. Every dollar spent on another weapons system is a dollar stolen from the people you represent.',
  },
  {
    id: 'corporate-power',
    title: 'Curb Corporate Power & Monopolies',
    description: 'Anti-monopoly and anti-corruption enforcement',
    messageParagraph:
      'A handful of corporations now control what we eat, what we see, what we pay, and increasingly, what laws get passed. This level of concentrated power is incompatible with democracy and it is strangling economic opportunity for everyone else. I demand that you aggressively enforce antitrust laws, break up monopolies, ban corporate lobbying, and end the revolving door between industry and government. The economy is not working for regular people because it was redesigned to serve consolidated corporate power. This has to end now.',
  },
  {
    id: 'reproductive-justice',
    title: 'Reproductive Justice & Bodily Autonomy',
    description: 'Protect abortion and reproductive healthcare',
    messageParagraph:
      'Bodily autonomy is under direct attack. People are being forced to carry pregnancies against their will, denied lifesaving medical procedures, and criminalized for their healthcare decisions. This is happening right now, in this country. I demand that you fight to protect and expand access to abortion, contraception, and comprehensive reproductive healthcare nationwide with the full urgency this moment requires. Every day without action, more people suffer under laws that treat them as less than full human beings. This is not a debate. It is a crisis of fundamental rights.',
  },
  {
    id: 'queer-rights',
    title: 'Defend LGBTQ+ Rights & Equality',
    description: 'Full legal equality and protection from discrimination',
    messageParagraph:
      'LGBTQ+ rights that took decades to win are being systematically dismantled. Book bans, classroom censorship laws, rollbacks of anti-discrimination protections, and open political campaigns to dehumanize queer people are escalating across the country. Marriage equality itself is no longer guaranteed. This is not paranoia. It is a coordinated effort to push queer people back into the margins of public life. I demand that you fight to codify anti-discrimination protections for LGBTQ+ people in housing, employment, healthcare, and education at the federal level, oppose every piece of legislation designed to erase or marginalize queer communities, and treat attacks on LGBTQ+ rights as the civil rights emergency they are. Silence in this moment is abandonment.',
  },
  {
    id: 'disability-rights',
    title: 'Disability Rights & Accessibility',
    description: 'Full inclusion, not poverty by design',
    messageParagraph:
      'Disabled people in this country are systematically kept in poverty, locked out of public life, and treated as an afterthought in nearly every policy conversation. SSI and SSDI force recipients to stay destitute to keep their benefits. Workplaces, transit systems, and public spaces remain inaccessible decades after the ADA was passed. Institutionalization is still used as a substitute for community support. I demand that you fight to fully fund and enforce accessibility law, raise SSI and SSDI out of poverty-level payments, eliminate asset limits that punish disabled people for saving, and invest in community-based services that allow people to live with dignity and autonomy. Disabled people are not an edge case. They are one in four Americans, and they deserve more than survival.',
  },
  {
    id: 'racial-justice',
    title: 'Racial Justice & Reparations',
    description: 'Confront structural racism and the legacy of slavery',
    messageParagraph:
      'Centuries of slavery, Jim Crow, redlining, and ongoing systemic racism have created a racial wealth gap and structural inequality that will not resolve on its own. Black Americans face compounding disadvantages in wealth, health, education, housing, and the legal system. None of this is by accident. All of it is by design. I demand that you support a formal study and program of reparations for Black Americans, invest in closing the racial wealth gap, and dismantle the structural barriers embedded in every institution from lending to education funding to the criminal legal system. Acknowledging history is not enough. Material repair is owed, and every year of delay deepens the injustice.',
  },
  {
    id: 'indigenous-sovereignty',
    title: 'Indigenous Sovereignty & Land Rights',
    description: 'Honor treaties, protect land, and center Indigenous self-determination',
    messageParagraph:
      'The United States was built on stolen Indigenous land, and the theft continues today through broken treaties, resource extraction on sacred sites, and the systematic neglect of Native communities. The crisis of missing and murdered Indigenous people goes largely ignored. Reservations lack basic infrastructure while corporations extract billions in resources from tribal land. I demand that you honor existing treaties, protect Indigenous land and water from corporate exploitation, fully fund the Indian Health Service and tribal infrastructure, and support legislation to address the epidemic of violence against Indigenous people. Indigenous sovereignty is not a historical footnote. It is an ongoing obligation that this government continues to violate.',
  },
  {
    id: 'surveillance-digital-rights',
    title: 'End Mass Surveillance & Protect Digital Rights',
    description: 'Privacy, accountability, and limits on tech power',
    messageParagraph:
      'Government agencies and private corporations are surveilling the public on a massive scale. They are tracking movements, harvesting personal data, deploying facial recognition, and using algorithmic systems to police, punish, and manipulate people with virtually no oversight or accountability. This infrastructure of control is already being used to target activists, immigrants, and marginalized communities. I demand that you support comprehensive federal privacy legislation, ban government use of facial recognition technology, regulate algorithmic decision-making in policing and public services, and end the unchecked partnership between Big Tech and law enforcement. A surveillance state is incompatible with a free society. Act before this infrastructure becomes impossible to dismantle.',
  },
  {
    id: 'drug-decriminalization',
    title: 'End the War on Drugs & Decriminalize',
    description: 'Public health over criminalization',
    messageParagraph:
      'The war on drugs has been a catastrophic, decades-long failure that has destroyed millions of lives, disproportionately Black and brown lives, while doing nothing to reduce addiction or improve public safety. People are locked in prison for substance use while pharmaceutical companies that fueled the opioid epidemic walk free. I demand that you support the decriminalization of drug possession, invest in harm reduction and evidence-based treatment, expunge the records of those convicted of nonviolent drug offenses, and end the policies that treat addiction as a crime rather than a public health crisis. Every day this failed war continues, more people are caged, more families are shattered, and more lives are lost to overdose deaths that a humane system could prevent.',
  },
  {
    id: 'food-sovereignty',
    title: 'Food Sovereignty & End Hunger',
    description: 'Food as a right, not a market outcome',
    messageParagraph:
      'Millions of people in this country, including children, go hungry every day while corporations control the food supply, receive billions in subsidies, and throw away massive quantities of food for profit. This is not scarcity. It is engineered inequality. Farm workers who harvest our food cannot afford to feed their own families. I demand that you support universal free school meals, expand and protect SNAP and nutrition programs, invest in local and sustainable food systems, hold agribusiness monopolies accountable, and guarantee that no person in this country goes without food. Hunger in a nation of abundance is not a tragedy. It is a political choice, and it must end now.',
  },
];

export default issues;
