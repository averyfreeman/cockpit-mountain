/*
 * Copyright (C) 2019 Red Hat, Inc.
 * SPDX-License-Identifier: LGPL-2.1-or-later
 */


import { Button } from "@patternfly/react-core/dist/esm/components/Button/index.js";
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '@patternfly/react-core/dist/esm/components/Card/index.js';
import { Gallery, GalleryItem } from "@patternfly/react-core/dist/esm/layouts/Gallery/index.js";

export const CardsDemo = () => {
    const cards = [
        <Card isCompact key="card1">
            <CardBody>I&apos;m a card in a gallery</CardBody>
        </Card>,
        <Card isCompact key="card2">
            <CardBody>I&apos;m a card in a gallery</CardBody>
            <CardFooter>I have a footer</CardFooter>
        </Card>,
        <Card isCompact key="card3">
            <CardBody>I&apos;m a card in a gallery</CardBody>
        </Card>,
        <Card isCompact key="card4">
            <CardTitle>I have a header too</CardTitle>
            <CardBody>I&apos;m a card in a gallery</CardBody>
        </Card>,
        <Card key="card5">
            <CardHeader actions={{
                actions: <><input type="checkbox" />
                    <Button className="btn">click</Button></>,
            }} />
            <CardTitle>This is a card header</CardTitle>
            <CardBody>I&apos;m a card in a gallery</CardBody>
        </Card>,
        <GalleryItem key="card6">
            I&apos;m not a card, but I&apos;m in the gallery too, as a generic GalleryItem.
        </GalleryItem>,
    ];
    return (
        <Gallery hasGutter>
            { cards }
        </Gallery>
    );
};
