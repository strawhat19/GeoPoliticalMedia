# AI Instructions

1. When making code changes,
dont verify or test or build the code, 
just make minimal code changes and let the user look at the code diff and verify themselves before they commit.

2. Always try your best to structure code and imports like this:

code line 1
code line 2 - A
code line 3 - ABC

^ should be like a christmas tree where shortest line length is at the top going down to longest line length.

^ try your best to keep this structure its ok if it differs sometimes.

3. try to use SCSS over CSS whenever possible

4. in html or tsx or jsx, all elements should have a descriptive className and ID, especially if its rendered in a for loop or map. the ID can be like the Class but with the id or index of the element.
User should be able to inspect any element and see its class and then give that back to AI as reference.

5. when making buttons or clickable items, try your best to put icon text together. or icon only.

6. when making transitions, always prefer smooth transitions over flat static transitions.

7. prefer to break things out to make them more readable, like instead of:

<Text style={[styles.tabLabel, { color: timelineMode === value ? palette.blue : palette.muted }]} {...elementProps(`analytics-timeline-tab-label`, `${scope}-${value}`)}>{label}</Text>

or 

<Label className={`intro-eyebrow`} style={styles.eyebrow}>{`A LITTLE CLARITY GOES A LONG WAY`}</Label>

or

<Label className={`reset-confirmation-title`} style={styles.resetTitle}>{`Start fresh?`}</Label>

prefer like this

<Text 
    {...elementProps(`analytics-timeline-tab-label`, `${scope}-${value}`)} 
    style={[styles.tabLabel, { color: timelineMode === value ? palette.blue : palette.muted }]}
>
    {label}
</Text>

or this 

<Label className={`intro-eyebrow`} style={styles.eyebrow}>
    {`A LITTLE CLARITY GOES A LONG WAY`}
</Label>

or this

<Label className={`reset-confirmation-title`} style={styles.resetTitle}>
    {`Start fresh?`}
</Label>

8. in javascript or typescript or tsx or jsx, always use backticks whenever possible, if not then use single quotes, and double quotes as a last resort.

9. make apps with expo react native typescript sass with web and mobile, unless instructed to do otherwise (like angular or vue or next)

10. each app should either be a PWA or mobile app deployable to app store along with web so it can be put on a website with one of my custom domains

11. shared state should be managed either through context api for react or services with angular inside a shared/ folder, each app can have users, user, theme, etc. for example

12. each component should have its own folder, with logic, structure, and styles separated