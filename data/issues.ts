/**
 * Civic issues data
 * Each issue contains an id, title, optional description, and message paragraph.
 */

export interface Issue {
  id: string;
  title: string;
  description?: string;
  messageParagraph: string;
}

// TODO: Add queer rights

export const issues: Issue[] = [
  {
    id: 'universal-healthcare',
    title: 'Universal Healthcare (Medicare for All)',
    description: 'Healthcare as a human right, not a commodity',
    messageParagraph:
      'Healthcare is a human right, not a privilege reserved for those who can afford it. I urge you to support universal, single-payer healthcare that guarantees comprehensive coverage for every person in this country, regardless of income, employment, or immigration status. For-profit insurance companies should not be allowed to extract wealth while people delay care, ration medication, or die from preventable causes.',
  },
  {
    id: 'climate-justice',
    title: 'Climate Justice & Green New Deal',
    description: 'Climate action centered on people, not corporations',
    messageParagraph:
      'The climate crisis is already harming working-class and marginalized communities, while fossil fuel corporations continue to profit. I urge you to support bold climate action aligned with a Green New Deal—rapidly transitioning away from fossil fuels, investing in publicly owned renewable energy, and ensuring that workers and frontline communities are not left behind. Incrementalism is no longer sufficient.',
  },
  {
    id: 'police-violence',
    title: 'End Police Violence & Mass Incarceration',
    description: 'Accountability, decarceration, and community safety',
    messageParagraph:
      'Police violence and mass incarceration are moral and social failures that disproportionately harm Black, Indigenous, and marginalized communities. I urge you to support legislation that holds law enforcement accountable, ends qualified immunity, reduces incarceration, and redirects funding toward housing, healthcare, education, and community-based safety programs that actually prevent harm.',
  },
  {
    id: 'trans-rights',
    title: 'Protect Transgender People and Trans Youth',
    description: 'Oppose state-sponsored attacks on trans lives',
    messageParagraph:
      'Transgender people—especially trans youth—are facing coordinated political attacks that deny their dignity, safety, and access to healthcare. I urge you to unequivocally oppose legislation that restricts gender-affirming care, censors education, or enables discrimination. Trans people deserve safety, autonomy, and the right to exist without political scapegoating.',
  },
  {
    id: 'immigration-abolish-ice',
    title: 'End ICE Abuses & Protect Immigrants',
    description: 'Human rights over detention and deportation',
    messageParagraph:
      'ICE and related enforcement agencies have inflicted widespread harm through family separation, detention, and deportation. I urge you to support policies that drastically reduce detention, end abusive enforcement practices, protect asylum seekers, and provide permanent legal status for undocumented people. No one should live in fear because of where they were born.',
  },
  {
    id: 'workers-rights',
    title: 'Workers’ Rights & Union Power',
    description: 'Collective bargaining and workplace democracy',
    messageParagraph:
      'Workers are producing record profits while wages stagnate and labor protections are eroded. I urge you to support legislation that strengthens unions, protects the right to organize, raises the minimum wage to a living wage, and reins in corporate exploitation. Working people deserve power over their labor and a fair share of the wealth they create.',
  },
  {
    id: 'housing-as-a-right',
    title: 'Housing as a Human Right',
    description: 'Decommodify housing and end homelessness',
    messageParagraph:
      'Housing should not be treated as a speculative asset while people are unhoused or rent-burdened. I urge you to support massive investment in social and public housing, strong tenant protections, rent stabilization, and policies that curb real estate speculation. No one should be homeless in one of the wealthiest countries in the world.',
  },
  {
    id: 'student-debt',
    title: 'Cancel Student Debt & Fund Public Education',
    description: 'Education without lifelong debt',
    messageParagraph:
      'Student debt is a policy choice that has trapped generations in financial insecurity. I urge you to support full cancellation of federal student debt and robust funding for tuition-free public higher education. Education should empower people, not shackle them to decades of repayment.',
  },
  {
    id: 'voting-rights-democracy',
    title: 'Expand Voting Rights & Democratic Participation',
    description: 'Democracy without barriers',
    messageParagraph:
      'Our democracy is undermined when voting is restricted, districts are gerrymandered, and money dominates politics. I urge you to support automatic voter registration, expanded early and mail-in voting, an end to voter suppression, and meaningful campaign finance reform so that elected officials are accountable to people—not donors.',
  },
  {
    id: 'foreign-policy',
    title: 'End Endless War & Military Overspending',
    description: 'Diplomacy over militarism',
    messageParagraph:
      'The United States continues to spend obscene amounts on the military while basic needs go unmet at home. I urge you to oppose endless wars, reduce the military budget, and redirect resources toward healthcare, housing, climate action, and education. True security comes from meeting human needs, not perpetual war.',
  },
  {
    id: 'corporate-power',
    title: 'Curb Corporate Power & Monopolies',
    description: 'Anti-monopoly and anti-corruption enforcement',
    messageParagraph:
      'Corporate consolidation and political influence have hollowed out our democracy and economy. I urge you to aggressively enforce antitrust laws, break up monopolies, and prevent corporations from writing the rules that govern them. The economy should serve people, not concentrated wealth.',
  },
  {
    id: 'reproductive-justice',
    title: 'Reproductive Justice & Bodily Autonomy',
    description: 'Protect abortion and reproductive healthcare',
    messageParagraph:
      'Bodily autonomy is fundamental to freedom and equality. I urge you to protect and expand access to abortion, contraception, and comprehensive reproductive healthcare nationwide. No one should be forced into pregnancy or denied care because of political ideology.',
  },
];

export default issues;
