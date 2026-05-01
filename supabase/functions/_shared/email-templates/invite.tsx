/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import {
  LOGO_URL,
  LAGRIMA_URL,
  main,
  container,
  logoStyle,
  h1,
  text,
  button,
  lagrimaStyle,
  footer,
  fontImport,
} from './_chora-styles.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <style>{fontImport}</style>
    </Head>
    <Preview>você foi convidado pro chŏra lovable</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="chŏra lovable" style={logoStyle} />
        <Heading style={h1}>
          você tá
          <br />
          dentro 🚀
        </Heading>
        <Text style={text}>
          você foi convidado pra imersão chŏra lovable. clica no botão pra criar sua conta no hub e começar a preparação.
        </Text>
        <Button style={button} href={confirmationUrl}>
          aceitar convite
        </Button>
        <Text style={text}>se isso chegou por engano, pode ignorar tranquilo.</Text>
        <Img src={LAGRIMA_URL} alt="" style={lagrimaStyle} />
        <Text style={footer}>
          vai lá e cria.
          <br />
          chŏra lovable 2026 · 25-26 abril · porto alegre
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
