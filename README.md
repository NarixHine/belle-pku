# Belle PKU

> [!TIP]
> You don't need to read the following `README.md` if you intend to try out Belle PKU. The usage is straightforward enough that you can simply install the extension, jump to your pre-selection page, and start using it. The UI is self-explanatory.
>
> That said, there's an English placement exam tomorrow, so I've got to find something to practice with. Hence the doc!

![](image.png)

Belle PKU is a lightweight browser extension that improves the interface of the official PKU website. Currently, it **offers a preview of your timetable before you select a course** by inserting a hoverable badge next to each lesson. Expect continuous iterations in the coming days.

> [!WARNING]
> Belle PKU is only an interface upgrade. It does not (and will not) offer any automation capabilities.

## Installation Guide

Download the latest release from the [GitHub releases page](https://github.com/narixhine/belle-pku/releases), and refer to the installation instructions for your browser ([Chrome](https://web-highlights.com/tutorials/browser/chrome/how-to-install-from-local-file) / [Firefox](https://web-highlights.com/tutorials/browser/firefox/how-to-install-from-local-file))

## What it does

When you load a pre-selection page on `elective.pku.edu.cn`, a badge is appended to the Class Info column of each lesson, indicating whether the prospective lesson introduces a schedule conflict for your current timetable. Hovering over the badge invokes a hypothetical timetable that visualizes your post-selection schedule, with warnings of conflicts where present.

Pre-existent courses with conflicting lesson slots are represented with a translucent fill, while those precise slots are highlighted with slanted patterns.

## How it works

To PKU's credit, all Class Info fields on the PKU elective platform follow a generally consistent and easily parsable format — leading with weeks, followed by the day of the week and closing with time slots. The extension relies on this field to extract schedule information and inject it into the preview.

The extension also leverages the "Already Selected" section on the same page to supply data about pre-existent courses, circumventing invokation of other endpoints. This is crucial for the smooth functioning of the PKU elective system, as the abuse detection system seems to have a strong tendency to flag concurrent requests, an unreliable (!!!) indicator of bot usage that biases significantly toward false positives. Otherwise, your session will get purged as a result, and you are out!

## Feedback

This extension is still under active development. Here and there you may find bugs, missing features and behavior that falls short of expectations. Feedback is greatly appreciated!
