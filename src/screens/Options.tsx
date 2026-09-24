import { PanelScene } from '../components/Panel';
import { OptionsForm } from '../components/OptionsForm';

export function Options({ onBack }: { onBack: () => void }) {
    return <PanelScene aria-labelledby="options-title">
        <h1 id="options-title">Options</h1>
        <OptionsForm onDone={onBack} onCancel={onBack} returnLabel="Main Menu" />
    </PanelScene>;
}