import EmployerMatchWidget from './EmployerMatchWidget.astro'

// Takes no props. Renders Double the Donation's embed with the live site's
// public key; in Storybook the plugin script doesn't run (scripts inserted
// via innerHTML never execute), so only the static attribution shows.
export default {
  title: 'Molecules/EmployerMatchWidget',
  component: EmployerMatchWidget,
}

export const Default = {
  args: {},
}
