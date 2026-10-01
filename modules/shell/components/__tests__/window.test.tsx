/* @vitest-environment jsdom */

import { fireEvent, render as rtlRender, screen } from "@testing-library/react";
import {NextIntlClientProvider} from 'next-intl';
import messages from '@/messages/en.json';
import {TooltipProvider} from '@/components/ui/tooltip';
import { describe, expect, it } from "vitest";
import { Window } from "@/modules/shell/components/window";
function render(ui:React.ReactElement){return rtlRender(<NextIntlClientProvider locale="en" messages={messages}><TooltipProvider>{ui}</TooltipProvider></NextIntlClientProvider>);}

describe("Window", () => {
  it('resizes from the left while keeping the right edge in place',()=>{
    const {container}=render(<Window title="Settings" defaultWidth={860} defaultHeight={620} onClose={()=>{}} animationsEnabled={false}><div>resize content</div></Window>);
    const frame=container.querySelector('[data-desktop-window]') as HTMLElement;
    const startX=parseFloat(frame.style.left);
    fireEvent.mouseDown(container.querySelector('[data-resize-edge="w"]')!,{clientX:300,clientY:200});
    fireEvent.mouseMove(window,{clientX:200,clientY:200});
    fireEvent.mouseUp(window);
    expect(frame.style.width).toBe('960px');
    expect(parseFloat(frame.style.left)+parseFloat(frame.style.width)).toBe(startX+860);
  });
  it('offers keyboard resizing without moving the window',()=>{
    const {container}=render(<Window title="Settings" defaultWidth={860} defaultHeight={620} onClose={()=>{}} animationsEnabled={false}><div>keyboard content</div></Window>);
    fireEvent.keyDown(screen.getByRole('button',{name:'Resize window'}),{key:'ArrowRight',shiftKey:true});
    expect((container.querySelector('[data-desktop-window]') as HTMLElement).style.width).toBe('910px');
  });
  it("maximizes into the desktop area above a bottom dock", () => {
    render(
      <Window
        title="App Store"
        onClose={() => {}}
        dockPosition="bottom"
        animationsEnabled={false}
      >
        <div>content</div>
      </Window>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Maximize window" }));

    const container = screen.getByText("content").closest("div.absolute");
    expect(container).toBeTruthy();
    expect(container?.getAttribute("style")).toContain("top: 0px");
    expect(container?.getAttribute("style")).toContain("right: 0px");
    expect(container?.getAttribute("style")).toContain("bottom: 88px");
    expect(container?.getAttribute("style")).toContain("left: 0px");
  });

  it("maximizes around a side dock", () => {
    render(
      <Window
        title="Monitor"
        onClose={() => {}}
        dockPosition="left"
        animationsEnabled={false}
      >
        <div>monitor</div>
      </Window>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Maximize window" }));

    const container = screen.getByText("monitor").closest("div.absolute");
    expect(container).toBeTruthy();
    expect(container?.getAttribute("style")).toContain("top: 0px");
    expect(container?.getAttribute("style")).toContain("right: 0px");
    expect(container?.getAttribute("style")).toContain("bottom: 0px");
    expect(container?.getAttribute("style")).toContain("left: 80px");
  });
});
