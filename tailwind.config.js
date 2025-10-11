/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['"Manrope"', ...defaultTheme.fontFamily.sans],
				display: ['"Space Grotesk"', ...defaultTheme.fontFamily.sans],
				mono: [...defaultTheme.fontFamily.mono]
			},
			colors: {
				background: 'hsl(var(--color-bg))',
				surface: {
					DEFAULT: 'hsl(var(--color-surface))',
					soft: 'hsl(var(--color-surface-soft))',
					emphasis: 'hsl(var(--color-surface-strong))'
				},
				brand: {
					DEFAULT: 'hsl(var(--color-brand))',
					foreground: 'hsl(var(--color-brand-foreground))',
					muted: 'hsl(var(--color-brand-muted))'
				},
				accent: 'hsl(var(--color-accent))',
				muted: 'hsl(var(--color-muted))',
				border: 'hsl(var(--color-border))',
				success: 'hsl(var(--color-success))',
				warning: 'hsl(var(--color-warning))',
				info: 'hsl(var(--color-info))'
			},
			boxShadow: {
				brand: '0 25px 50px -12px rgba(16, 112, 122, 0.35)',
				soft: '0 15px 30px rgba(20, 56, 67, 0.12)'
			},
			backgroundImage: {
				'pulse-rings':
					'radial-gradient(circle at 20% 20%, rgba(16, 112, 122, 0.18), transparent 45%), radial-gradient(circle at 80% 30%, rgba(255, 167, 67, 0.2), transparent 50%)',
				'grid-fade':
					'radial-gradient(circle, rgba(22, 51, 61, 0.12) 1px, transparent 1px)',
			},
			backgroundSize: {
				'grid-fade': '24px 24px'
			},
			borderRadius: {
				extra: '2.5rem'
			}
		}
	},
	plugins: []
};
