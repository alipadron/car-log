import { Component, input } from '@angular/core';

/**
 * Consistent page-level heading. Used once per view, outside any card.
 * Card-level titles (e.g. vehicle names inside cards) keep using `hlmCardTitle`.
 */
@Component({
  selector: 'app-page-heading',
  template: `<h2 class="text-xl font-semibold">{{ title() }}</h2>`,
  host: {
    class: 'block',
  },
})
export class PageHeading {
  readonly title = input.required<string>();
}
