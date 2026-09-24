import type { ComponentPropsWithRef, ComponentPropsWithoutRef } from 'react';
import './panels.css';

export function PanelBrand() {
    return <img className="panel-brand" src="/assets/Hiroshi_logo.png" alt="Hiro Project" />;
}

export function PanelScene({ children, className = '', ...props }: ComponentPropsWithoutRef<'main'>) {
    return <main {...props} className={'panel-scene ' + className}>
        <section className="panel-frame panel-card">{children}</section>
        <PanelBrand />
    </main>;
}

export function PanelButton({ tone = 'primary', type = 'button', className = '', ...props }:
    ComponentPropsWithRef<'button'> & { tone?: 'primary' | 'secondary' }) {
    return <button {...props} type={type} className={'panel-button panel-button--' + tone + ' ' + className} />;
}

const icons = { plus: 'icon_plus', minus: 'icon_minus', previous: 'icon_turn_left', next: 'icon_turn_right' };
export function PanelRoundButton({ icon, type = 'button', className = '', ...props }:
    ComponentPropsWithRef<'button'> & { icon: keyof typeof icons }) {
    return <button {...props} type={type} className={'panel-round ' + className}>
        <img src={'/assets/png/retina/ui/controls/' + icons[icon] + '.png'} alt="" />
    </button>;
}