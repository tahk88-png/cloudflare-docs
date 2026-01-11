import type { RentboxCalendarIcon } from "../../../util/rentbox/calendar-status";

type Props = {
	icon: RentboxCalendarIcon;
	title?: string;
};

export function StatusIcon({ icon, title }: Props) {
	switch (icon) {
		case "warning": {
			return (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden={title ? undefined : true}
				>
					{title ? <title>{title}</title> : null}
					<path d="M10.3 3.2 1.9 18.1c-.7 1.2.2 2.7 1.6 2.7h16.9c1.4 0 2.3-1.5 1.6-2.7L13.7 3.2c-.7-1.2-2.7-1.2-3.4 0Z" />
					<path d="M12 9v4" />
					<path d="M12 17h.01" />
				</svg>
			);
		}
		case "wrench": {
			return (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden={title ? undefined : true}
				>
					{title ? <title>{title}</title> : null}
					<path d="M14.7 6.3a4.8 4.8 0 0 0-6.5 6.5L3 18v3h3l5.2-5.2a4.8 4.8 0 0 0 6.5-6.5l-2.7 2.7-2.3-.6-.6-2.3 2.6-2.8Z" />
				</svg>
			);
		}
		case "lock": {
			return (
				<svg
					viewBox="0 0 24 24"
					fill="none"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden={title ? undefined : true}
				>
					{title ? <title>{title}</title> : null}
					<path d="M16 11V8a4 4 0 0 0-8 0v3" />
					<path d="M6 11h12v10H6z" />
				</svg>
			);
		}
	}
}

