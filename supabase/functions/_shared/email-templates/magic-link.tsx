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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      {/* evita pre-fetch de scanners de email (Outlook Safe Links etc) consumirem o token single-use */}
      <meta name="referrer" content="no-referrer" />
      <meta name="x-apple-disable-message-reformatting" />
      <meta httpEquiv="x-dns-prefetch-control" content="off" />
      <style>{fontImport}</style>
    </Head>
    <Preview>seu link mágico pro chŏra chegou</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="chŏra lovable" style={logoStyle} />
        <Heading style={h1}>
          seu link
          <br />
          chegou 👀
        </Heading>
        <Text style={text}>
          clica no botão pra entrar no hub do chŏra. o link vale por 1 hora e só funciona uma vez.
        </Text>
        <Button style={button} href={confirmationUrl}>
          entrar no hub
        </Button>
        <Text style={text}>
          dica: abre o link no <strong>mesmo dispositivo</strong> onde pediu. se não funcionar, volta em chorahub.lovable.app e pede um novo.
        </Text>
        <Text style={text}>se não foi você que pediu, ignora esse email tranquilo.</Text>
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

export default MagicLinkEmail
